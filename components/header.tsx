"use client";

import { Settings, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Mic className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-lg">Koe Asset Maker</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onSettingsClick}>
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
