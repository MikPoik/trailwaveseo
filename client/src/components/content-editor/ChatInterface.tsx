import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Copy, Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WebsiteAnalysis, PageAnalysis } from "@/lib/types";
import { ChatMessage } from "@shared/schema";
import ChatMessageComponent from "./ChatMessage";
import { apiRequest } from "@/lib/queryClient";

interface ChatInterfaceProps {
  analysisId: number;
  pageUrl: string;
  pageData?: PageAnalysis;
  analysis: WebsiteAnalysis;
}

const ChatInterface = ({ analysisId, pageUrl, pageData, analysis }: ChatInterfaceProps) => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversation history
  const { data: conversation, isLoading } = useQuery<{ messages: ChatMessage[] }>({
    queryKey: [`/api/content-conversations/${analysisId}/${encodeURIComponent(pageUrl)}`],
    enabled: !!analysisId && !!pageUrl,
  });

  const messages: ChatMessage[] = conversation?.messages || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const response = await apiRequest('POST', `/api/content-conversations/${analysisId}/${encodeURIComponent(pageUrl)}/message`, { message: userMessage });
      return await response.json();
    },
    onMutate: async (userMessage) => {
      setIsTyping(true);
      
      // Optimistically add user message
      const previousConversation = queryClient.getQueryData([`/api/content-conversations/${analysisId}/${encodeURIComponent(pageUrl)}`]);
      
      queryClient.setQueryData([`/api/content-conversations/${analysisId}/${encodeURIComponent(pageUrl)}`], (old: any) => ({
        ...old,
        messages: [
          ...(old?.messages || []),
          {
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString()
          }
        ]
      }));

      return { previousConversation };
    },
    onSuccess: (data) => {
      // Update with AI response
      queryClient.setQueryData([`/api/content-conversations/${analysisId}/${encodeURIComponent(pageUrl)}`], data);
      setMessage("");
      setIsTyping(false);
    },
    onError: (error, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousConversation) {
        queryClient.setQueryData([`/api/content-conversations/${analysisId}/${encodeURIComponent(pageUrl)}`], context.previousConversation);
      }
      
      setIsTyping(false);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <Card className="h-[600px]">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading conversation...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0 border-b">
        <CardTitle className="flex items-center text-lg">
          <MessageCircle className="h-5 w-5 mr-2 text-blue-600" />
          Content Editor Chat
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Get AI help with your content based on analysis insights
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 overflow-hidden w-full">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Start a conversation about your content</p>
              <p className="text-sm text-gray-400">
                Try: "Help me improve the title" or "Expand the first paragraph"
              </p>
            </div>
          ) : (
            <div className="space-y-4 w-full overflow-hidden">
              {messages.map((msg, index) => (
                <ChatMessageComponent 
                  key={index} 
                  message={msg}
                  onCopy={(content: string) => {
                    navigator.clipboard.writeText(content);
                    toast({
                      title: "Copied!",
                      description: "Content copied to clipboard",
                    });
                  }}
                />
              ))}
              {isTyping && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex space-x-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for help with your content... (Press Enter to send, Shift+Enter for new line)"
              className="flex-1 min-h-[80px] resize-none"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            The AI has access to your page analysis, SEO suggestions, and business context
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatInterface;