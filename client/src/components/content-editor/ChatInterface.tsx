import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Copy, Loader2, MessageCircle, Lightbulb } from "lucide-react";
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
      <Card className="h-[800px]">
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
    <div className="flex flex-col h-full w-full py-0 pb-0">
      <Card className="flex flex-col w-full h-[800px] py-1">
        <CardHeader className="flex-shrink-0 border-b py-3 px-6">
          <CardTitle className="flex items-center text-lg">
            <MessageCircle className="h-5 w-5 mr-2 text-blue-600" />
            Chat
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 w-full max-w-full overflow-hidden min-h-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 overflow-y-auto overflow-x-hidden w-full min-h-0 max-h-[600px]">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Start a conversation about your content</p>
              <p className="text-sm text-gray-400">
                Try: "Help me improve the title" or "Expand the first paragraph"
              </p>
            </div>
          ) : (
            <div className="space-y-4 w-full min-w-0 overflow-hidden">
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
        <div className="border-t p-4 bg-gray-50 flex-shrink-0">
          <div className="flex space-x-2 items-end">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for help with your content... (Press Enter to send, Shift+Enter for new line)"
              className="flex-1 min-h-[120px] max-h-[200px] resize-y"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="px-4 py-2 h-12"
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

      {/* AI Suggestions Section - Now below the chat */}
      {pageData?.suggestions && pageData.suggestions.length > 0 && (
        <Card className="mt-4 flex-shrink-0">
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <Lightbulb className="h-4 w-4 mr-2 text-blue-600" />
              <h3 className="text-sm font-medium text-blue-800">
                AI Suggestions ({pageData.suggestions.length})
              </h3>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {pageData.suggestions.map((suggestion, index) => (
                <div key={index} className="p-3 bg-white rounded-md border border-blue-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-blue-800 mb-1">
                        Suggestion #{index + 1}
                      </p>
                      <p className="text-sm text-blue-700 leading-relaxed">
                        {suggestion}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 p-1 h-auto"
                      onClick={() => {
                        navigator.clipboard.writeText(suggestion);
                        toast({
                          title: "Copied!",
                          description: "Suggestion copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ChatInterface;