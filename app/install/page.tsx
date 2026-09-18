import type { Metadata } from "next";
import InstallGuide from "@/components/InstallGuide";

export const metadata: Metadata = {
  title: "התקנה",
  description: "התחילו להשתמש ב-MAGAI Movies מיד, או התקינו אותו כמו אפליקציה על מסך הבית.",
};

export default function InstallPage() {
  return <InstallGuide />;
}
