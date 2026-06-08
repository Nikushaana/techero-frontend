import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { api } from "../lib/api/axios";

export const useDownloadInvoice = () => {
  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await api.get(`/invoices/${invoiceId}/download`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },

    onSuccess: () => {
      toast.success("ინვოისი ჩამოიტვირთა");
    },

    onError: () => {
      toast.error("ინვოისი ვერ ჩამოიტვირთა");
    },
  });
};