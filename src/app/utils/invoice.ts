export const getInvoiceLabel = (type: string) => {
  switch (type) {
    case "CREATE_ORDER":
      return "განცხადების შექმნის ინვოისი";
    case "REPAIR_ORDER":
      return "შეკეთების ინვოისი";
    case "SERVICE_ONSITE":
      return "ადგილზე მომსახურების ინვოისი";
    default:
      return "ინვოისი";
  }
};