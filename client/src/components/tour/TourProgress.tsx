import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourProgressProps {
  currentIndex: number;
  totalSteps: number;
  variant?: "dots" | "text" | "auto";
}

export function TourProgress({
  currentIndex,
  totalSteps,
  variant = "auto",
}: TourProgressProps) {
  const displayVariant =
    variant === "auto" ? (totalSteps <= 6 ? "dots" : "text") : variant;

  if (displayVariant === "text") {
    return (
      <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <span>
          Step <span className="text-indigo-600 dark:text-indigo-400">{currentIndex + 1}</span> of{" "}
          {totalSteps}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <motion.div
            key={index}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: isCurrent ? 1.2 : 1,
              opacity: 1,
            }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
            className={cn(
              "relative flex items-center justify-center rounded-full transition-all duration-300",
              isCompleted && "size-6",
              isCurrent && "size-7",
              !isCompleted && !isCurrent && "size-5"
            )}
          >
            {isCompleted ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
                className="flex size-full items-center justify-center rounded-full bg-green-500 dark:bg-green-600"
              >
                <Check className="size-3.5 text-white" strokeWidth={3} />
              </motion.div>
            ) : (
              <div
                className={cn(
                  "size-full rounded-full transition-all duration-300",
                  isCurrent
                    ? "bg-indigo-600 ring-4 ring-indigo-200 dark:bg-indigo-500 dark:ring-indigo-900/50"
                    : "bg-slate-300 dark:bg-slate-600"
                )}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
