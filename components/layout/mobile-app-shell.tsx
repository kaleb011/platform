import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { TopHeader } from "@/components/layout/top-header";
import { cn } from "@/lib/utils";

type MobileAppShellProps = {
  children: React.ReactNode;
  header: React.ComponentProps<typeof TopHeader>;
  mainClassName?: string;
};

export function MobileAppShell({
  children,
  header,
  mainClassName
}: MobileAppShellProps) {
  return (
    <div className="min-h-screen px-4 py-5">
      <div className="phone-shell mx-auto min-h-[100dvh] max-w-[430px] rounded-[36px]">
        <TopHeader {...header} />
        <main className={cn("app-safe-bottom relative space-y-4 px-4 pb-8 pt-4", mainClassName)}>
          {children}
        </main>
        <BottomTabBar />
      </div>
    </div>
  );
}
