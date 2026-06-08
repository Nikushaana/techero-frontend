import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();
    const path = request.nextUrl.pathname;

    // Skip middleware for authentication API routes
    if (path.startsWith('/api/auth/')) {
        return NextResponse.next();
    }

    let accessToken = request.cookies.get('accessToken')?.value;
    const refreshToken = request.cookies.get('refreshToken')?.value;

    let newCookies: string[] = [];
    
    // This allows us to inject the new token into the current request chain.
    const requestHeaders = new Headers(request.headers); 

    // --- 1. No access token: Try to refresh ---
    if (!accessToken && refreshToken) {
        try {
            const internalOrigin = process.env.NODE_ENV === 'production' 
            ? 'http://127.0.0.1:3000' 
            : request.nextUrl.origin;

            const refreshResponse = await fetch(`${internalOrigin}/api/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Cookie': `refreshToken=${refreshToken}`,
                    'Host': 'techero.ge',
                    'User-Agent': request.headers.get('user-agent') || '',
                }
            });

            if (refreshResponse.ok) {
                newCookies = refreshResponse.headers.getSetCookie();

                const authCookie = newCookies.find(c => c.trim().startsWith('accessToken='));
                if (authCookie) {
                    accessToken = authCookie.split(';')[0].split('=')[1];
                    
                    requestHeaders.set('Cookie', `accessToken=${accessToken}; refreshToken=${refreshToken}`);
                }
            }
        } catch (error) {
            console.error("Background token refresh failed:", error);
        }
    }

    // If refresh failed OR there was no refresh token, redirect to appropriate login pages
    if (!accessToken) {
        if (path.startsWith('/admin/')) {
            url.pathname = "/admin";
            return NextResponse.redirect(url);
        }
        if (path.startsWith('/staff/')) {
            url.pathname = "/staff";
            return NextResponse.redirect(url);
        }
        if (path.startsWith('/dashboard')) {
            url.pathname = "/auth/login";
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    // --- 2. Token exists (or was just refreshed), process roles ---
    try {
        const base64Url = accessToken.split(".")[1];
        if (!base64Url) throw new Error("Invalid token structure");

        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );

        const payload = JSON.parse(jsonPayload);
        const role = payload.role;

        const createFinalResponse = (res: NextResponse) => {
            newCookies.forEach(cookie => res.headers.append('Set-Cookie', cookie));
            return res;
        };

        // --- Admin Routing ---
        if (path === "/admin" && role === "admin") {
            url.pathname = "/admin/panel/main";
            return createFinalResponse(NextResponse.redirect(url));
        }
        if (path.startsWith('/admin/') && role !== "admin") {
            url.pathname = "/admin";
            const response = NextResponse.redirect(url);
            response.cookies.delete('accessToken');
            response.cookies.delete('refreshToken');
            return response;
        }

        // --- Staff Routing ---
        if (path === "/staff" && (role === "technician" || role === "delivery")) {
            url.pathname = `/staff/${role}/orders`;
            return createFinalResponse(NextResponse.redirect(url));
        }
        if (path.startsWith('/staff/') && !(role === "technician" || role === "delivery")) {
            url.pathname = "/staff";
            const response = NextResponse.redirect(url);
            response.cookies.delete('accessToken');
            response.cookies.delete('refreshToken');
            return response;
        }

        // Handle Admin/Staff layout mismatches on regular client pages
        if (!path.startsWith('/admin') && !path.startsWith('/staff') && role !== "individual" && role !== "company") {
            const response = path.startsWith("/dashboard") 
                ? NextResponse.redirect(new URL("/auth/login", request.url)) 
                : NextResponse.next();

            response.cookies.delete('accessToken');
            response.cookies.delete('refreshToken');
            return response;
        }

        // --- Users Routing & Login Handling ---
        if ((path.startsWith("/dashboard") || path.startsWith("/auth")) && (role === "individual" || role === "company")) {
            const segments = path.split("/");
            const currentRoleInPath = segments[2];
            if (currentRoleInPath !== role) {
                const section = segments[3] || "profile";
                const subsection = segments[4] ? `/${segments[4]}` : "";

                url.pathname = `/dashboard/${role}/${section}${subsection}`;
                url.search = request.nextUrl.search;

                return createFinalResponse(NextResponse.redirect(url));
            }
        }

        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            }
        });
        
        return createFinalResponse(response);

    } catch (error) {
        console.error("Middleware JWT processing failed:", error);
        url.pathname = "/";
        const response = NextResponse.redirect(url);
        response.cookies.delete('accessToken');
        response.cookies.delete('refreshToken');
        return response;
    }
}

export const config = {
    matcher: ['/((?!api|_next|[^?]*\\.[^?]+$).*)'],
};