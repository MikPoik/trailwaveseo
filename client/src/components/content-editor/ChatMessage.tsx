import { Button } from "@/components/ui/button";
import { Copy, User, Bot } from "lucide-react";
import { ChatMessage } from "@shared/schema";
import { format } from "date-fns";

interface ChatMessageProps {
  message: ChatMessage;
  onCopy: (content: string) => void;
}

const ChatMessageComponent = ({ message, onCopy }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] min-w-0 ${isUser ? 'order-2' : 'order-1'}`}>
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
        <div className={`relative group ${
          isUser 
            ? 'bg-blue-600 text-white rounded-l-lg rounded-br-lg' 
            : 'bg-gray-100 text-gray-900 rounded-r-lg rounded-bl-lg'
        } p-3 overflow-hidden`}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
            {message.content}
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