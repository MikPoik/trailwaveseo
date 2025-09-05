import { Button } from "@/components/ui/button";
import { Copy, User, Bot } from "lucide-react";
import { ChatMessage } from "@shared/schema";
import { format } from "date-fns";
import { marked } from "marked";

interface ChatMessageProps {
  message: ChatMessage;
  onCopy: (content: string) => void;
}

const ChatMessageComponent = ({ message, onCopy }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  
  // Configure marked for basic parsing without HTML sanitization (safe for our use case)
  const parseMarkdown = (text: string) => {
    try {
      return marked.parse(text, { 
        breaks: true, 
        gfm: true
      });
    } catch (error) {
      return text; // Fallback to plain text if parsing fails
    }
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 w-full min-w-0`}>
      <div className={`max-w-[85%] min-w-0 ${isUser ? 'ml-auto' : 'mr-auto'}`}>
        {/* Message Header */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex items-center gap-1 text-xs text-gray-500`}>
            {isUser ? (
              <>
                <User className="h-3 w-3" />
                <span>You</span>
              </>
            ) : (
              <>
                <Bot className="h-3 w-3" />
                <span>AI Assistant</span>
              </>
            )}
            <span>•</span>
            <span>{format(new Date(message.timestamp), 'HH:mm')}</span>
          </div>
        </div>

        {/* Message Content */}
        <div className={`relative group min-w-0 ${
          isUser 
            ? 'bg-blue-600 text-white rounded-l-lg rounded-br-lg' 
            : 'bg-gray-100 text-gray-900 rounded-r-lg rounded-bl-lg'
        } p-3`}>
          <div className="min-w-0 overflow-hidden">
            <div 
              className={`text-sm leading-relaxed break-words word-break-break-all overflow-wrap-anywhere prose prose-sm max-w-none ${
                isUser ? 'prose-invert' : ''
              }`}
              style={{ 
                wordWrap: 'break-word', 
                overflowWrap: 'anywhere', 
                wordBreak: 'break-word',
                '--tw-prose-body': isUser ? '#ffffff' : 'inherit',
                '--tw-prose-headings': isUser ? '#ffffff' : 'inherit',
                '--tw-prose-bold': isUser ? '#ffffff' : 'inherit',
                '--tw-prose-strong': isUser ? '#ffffff' : 'inherit'
              } as React.CSSProperties}
              dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
            />
          </div>
          
          {/* Copy Button */}
          {!isUser && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCopy(message.content)}
              className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-gray-200`}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageComponent;