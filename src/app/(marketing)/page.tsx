import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";

export const metadata: Metadata = {
  title: { absolute: "ReadAIness · Evidence-backed go/no-go decisions" },
  description:
    "Go/no-go calls for software releases, decided on evidence and signed by a person. Drop in your exports; numbers are checked in code, documents need a quote.",
};

export default function Page() {
  return <HomePage />;
}
