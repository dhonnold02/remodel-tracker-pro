import * as React from "react";
import {
  Tabs as ShadcnTabs,
  TabsList as ShadcnTabsList,
  TabsTrigger as ShadcnTabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Shared tab strip wrapper enforcing consistent styling across the app.
 * Re-exports `TabsContent` from shadcn unchanged.
 */
export const Tabs = ShadcnTabs;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof ShadcnTabsList>,
  React.ComponentPropsWithoutRef<typeof ShadcnTabsList>
>(({ className, ...props }, ref) => (
  <ShadcnTabsList
    ref={ref}
    className={cn("bg-muted rounded-xl p-1", className)}
    {...props}
  />
));
TabsList.displayName = "AppTabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof ShadcnTabsTrigger>,
  React.ComponentPropsWithoutRef<typeof ShadcnTabsTrigger>
>(({ className, ...props }, ref) => (
  <ShadcnTabsTrigger
    ref={ref}
    className={cn(
      "rounded-lg text-sm font-medium transition-all data-[state=active]:bg-accent data-[state=active]:text-accent-foreground",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "AppTabsTrigger";

export { TabsContent };