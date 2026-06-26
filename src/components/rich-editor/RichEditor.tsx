"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import OrderedList from "@tiptap/extension-ordered-list";
import BulletList from "@tiptap/extension-bullet-list";

const OrderedListNoInput = OrderedList.extend({ addInputRules() { return [] } });
const BulletListNoInput = BulletList.extend({ addInputRules() { return [] } });
import {
  BoldIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
} from "lucide-react";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  id?: string;
  autoFocus?: boolean;
}

function ToolbarButton({
  editor,
  command,
  isActive,
  children,
  label,
}: {
  editor: Editor;
  command: () => void;
  isActive: boolean;
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        command();
      }}
      onMouseDown={(e) => e.preventDefault()}
      className={`rounded-md p-1.5 transition ${
        isActive
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function sanitizeContent(html: string): string {
  const hasLi = /<li/i.test(html);
  const hasOrderedList = /<ol/i.test(html);

  if (hasOrderedList) {
    return html.replace(/(<li[^>]*>)([\s\S]*?)(<\/li>)/gi, (_match, open, text, close) => {
      const cleaned = text.replace(/^\s*\d+[.)]\s*/, "");
      return `${open}${cleaned}${close}`;
    });
  }

  if (!hasLi) {
    return html.replace(/^(\s*\d+[.)]\s*)/gm, "");
  }

  return html;
}

export default function RichEditor({
  value,
  onChange,
  placeholder = "Escribe aquí...",
  minHeight = 120,
  id,
  autoFocus,
}: RichEditorProps) {
  const lastValueRef = useRef(value);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        orderedList: false,
        bulletList: false,
      }),
      OrderedListNoInput,
      BulletListNoInput,
      Placeholder.configure({ placeholder }),
    ],
    content: sanitizeContent(value || ""),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastValueRef.current = html;
      if (html !== value) {
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[80px] px-4 py-3 text-foreground [&_.ProseMirror]:outline-none",
        style: `min-height: ${minHeight}px`,
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    if (value === lastValueRef.current) return;
    const sanitized = sanitizeContent(value || "");
    editor.commands.setContent(sanitized, { emitUpdate: false });
    lastValueRef.current = sanitized;
  }, [value, editor]);

  useEffect(() => {
    if (autoFocus && editor) {
      editor.commands.focus();
    }
  }, [autoFocus, editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted focus-within:ring-2 focus-within:ring-primary/40">
      <div className="flex items-center gap-0.5 border-b border-border bg-muted/80 px-2 py-1.5">
        <ToolbarButton
          editor={editor}
          command={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          label="Negrita"
        >
          <BoldIcon className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          command={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          label="Cursiva"
        >
          <ItalicIcon className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <ToolbarButton
          editor={editor}
          command={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          label="Lista con viñetas"
        >
          <ListIcon className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          command={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          label="Lista numerada"
        >
          <ListOrderedIcon className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
