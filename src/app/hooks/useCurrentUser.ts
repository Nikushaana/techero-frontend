"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/app/lib/api/axios";

const fetchCurrentUser = async () => {
    const { data } = await api.get("auth/current-user");
    return data;
};

export function useCurrentUser() {
    const query = useQuery({
        queryKey: ["currentUser"],
        queryFn: fetchCurrentUser,
        retry: false,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });

    return query;
}