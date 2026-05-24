import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  const className = clsx(inputs);
  if (typeof className !== "string") {
    return className ? String(className) : "";
  }
  return twMerge(className);
}
