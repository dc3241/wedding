"use client";

import { moveArrayItem, ReorderButtons } from "./ReorderButtons";
import type { FaqItem } from "@/components/website/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FaqEditorFieldsProps = {
  heading?: string;
  items: FaqItem[];
  onHeadingChange: (heading: string) => void;
  onChange: (items: FaqItem[]) => void;
};

export function FaqEditorFields({
  heading,
  items,
  onHeadingChange,
  onChange,
}: FaqEditorFieldsProps) {
  function addItem() {
    onChange([...items, { question: "", answer: "" }]);
  }

  function updateItem(
    index: number,
    field: "question" | "answer",
    value: string,
  ) {
    onChange(
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function move(from: number, to: number) {
    onChange(moveArrayItem(items, from, to));
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[13px] text-muted">
          Heading (optional)
        </label>
        <Input
          value={heading ?? ""}
          onChange={(e) => onHeadingChange(e.target.value)}
          placeholder="Questions & Answers"
        />
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] text-muted">
          No questions yet. Add FAQs your guests ask most.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={index}
              className="space-y-2 rounded-[var(--radius-inner)] bg-well p-3 shadow-recessed"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] text-muted">Question {index + 1}</span>
                <div className="flex items-center gap-2">
                  <ReorderButtons
                    index={index}
                    total={items.length}
                    onMove={move}
                    label={`question ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="text-[13px] text-muted hover:text-rosewood"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <Input
                value={item.question}
                onChange={(e) => updateItem(index, "question", e.target.value)}
                placeholder="Question"
              />
              <Textarea
                rows={3}
                value={item.answer}
                onChange={(e) => updateItem(index, "answer", e.target.value)}
                placeholder="Answer"
              />
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="default" onClick={addItem}>
        Add question
      </Button>
    </div>
  );
}
