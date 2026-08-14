import { ChildrenDirectory } from "@/components/kids";
import { MobileNavigation, Sidebar } from "@/components/open-daycare";

export default function KidsPage() {
  return <div className="min-h-screen bg-sand md:flex"><Sidebar activeHref="/kids" /><div className="min-w-0 flex-1"><MobileNavigation activeHref="/kids" /><main><ChildrenDirectory /></main></div></div>;
}
