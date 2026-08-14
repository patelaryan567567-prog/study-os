import { useState } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  onSearch,
  placeholder = "Search pages...",
  className,
}: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch?.(value);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-xl bg-white/5 p-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
      >
        <Search className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed left-1/2 top-20 z-50 w-full max-w-2xl -translate-x-1/2 px-4"
            >
              <div className="glass rounded-2xl shadow-2xl">
                <div className="flex items-center gap-3 p-4 border-b border-white/10">
                  <Search className="h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {query && (
                  <div className="p-4">
                    <p className="text-sm text-gray-400">
                      Search results for "{query}"
                    </p>
                    <div className="mt-3 space-y-2">
                      {["Dashboard", "Tasks", "Lectures", "Settings"].map(
                        (item) => (
                          <div
                            key={item}
                            className="rounded-lg bg-white/5 p-3 text-white transition-colors hover:bg-white/10"
                          >
                            {item}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
