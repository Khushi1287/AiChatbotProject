import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface SystemInstructionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (instruction: string) => void;
  currentInstruction?: string;
}

export function SystemInstructionModal({
  open,
  onClose,
  onSave,
  currentInstruction = '',
}: SystemInstructionModalProps) {
  const [instruction, setInstruction] = React.useState(currentInstruction);

  React.useEffect(() => {
    setInstruction(currentInstruction);
  }, [currentInstruction]);

  const handleSave = () => {
    onSave(instruction);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>🎭 System Instruction</DialogTitle>
          <DialogDescription>
            Set custom instructions for how the AI should behave. This will affect all future conversations with the default AI.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="For ex. You are a cat"
            className="min-h-[200px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            The more specific you are, the better the AI will understand how to behave.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 