'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "../ui/button"
import { Smile } from "lucide-react"
import type { Emote } from "@/lib/types"

const availableEmotes: Emote[] = [
    { name: 'gg', url: '/emotes/gg.png' },
    { name: 'hello', url: '/emotes/hello.png' },
    { name: 'think', url: '/emotes/think.png' },
    { name: 'sad', url: '/emotes/sad.png' },
    { name: 'laugh', url: '/emotes/laugh.png' },
    { name: 'wow', url: '/emotes/wow.png' },
];

interface EmotePickerProps {
    onEmoteSelect: (emote: Emote) => void;
}

export default function EmotePicker({ onEmoteSelect }: EmotePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto bg-background/80 border-primary">
        <div className="grid grid-cols-3 gap-2">
            {availableEmotes.map(emote => (
                 <Button 
                    key={emote.name} 
                    variant="ghost" 
                    className="p-2 h-16 w-16 hover:bg-primary/20"
                    onClick={() => onEmoteSelect(emote)}
                >
                    <div className="relative w-full h-full">
                        <img src={emote.url} alt={emote.name} className="object-contain w-full h-full"/>
                    </div>
                </Button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
