import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Download, Edit, Loader2, ImageIcon } from "lucide-react";

interface GeneratedImage {
  id?: string;
  imageUrl: string;
  prompt: string;
}

interface ImageGeneratorProps {
  onImageGenerated?: (imageUrl: string, prompt: string) => void;
  editImage?: GeneratedImage | null;
  onClearEdit?: () => void;
}

const ImageGenerator = ({ onImageGenerated, editImage, onClearEdit }: ImageGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  
  const { user } = useAuth();
  const { toast } = useToast();

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Xatolik",
        description: "Iltimos, prompt kiriting",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Xatolik",
        description: "Iltimos, tizimga kiring",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const requestBody: { prompt: string; editImageBase64?: string } = { prompt };
      
      if (editImage) {
        requestBody.editImageBase64 = editImage.imageUrl;
      }

      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: requestBody,
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || "Rasm yaratishda xatolik");
      }

      setGeneratedImage(data.imageUrl);
      setLastPrompt(prompt);
      
      // Save to database
      const { error: saveError } = await supabase
        .from("generated_images")
        .insert({
          user_id: user.id,
          prompt: prompt,
          image_url: data.imageUrl,
        });

      if (saveError) {
        console.error("Error saving image:", saveError);
      }

      onImageGenerated?.(data.imageUrl, prompt);

      toast({
        title: "Muvaffaqiyat!",
        description: "Rasm yaratildi va saqlandi",
      });

      setPrompt("");
      if (onClearEdit) onClearEdit();
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast({
        title: "Xatolik",
        description: error.message || "Rasm yaratishda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `ai-rasm-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Muvaffaqiyat!",
      description: "Rasm yuklab olindi",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            {editImage ? (
              <>
                <Edit className="w-5 h-5 text-accent" />
                Rasmni tahrirlash
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-primary" />
                Yangi rasm yaratish
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editImage && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tahrirlanayotgan rasm:</p>
              <div className="relative">
                <img
                  src={editImage.imageUrl}
                  alt="Editing"
                  className="w-full max-w-xs rounded-lg border border-border"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearEdit}
                  className="absolute top-2 right-2"
                >
                  Bekor qilish
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Oldingi prompt: "{editImage.prompt}"
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              placeholder={
                editImage
                  ? "Rasmni qanday o'zgartirmoqchisiz? Masalan: 'Fon rangini ko'k qil'"
                  : "Qanday rasm yaratmoqchisiz? Masalan: 'Tog'lar orasida quyosh botishi'"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isGenerating}
            />
          </div>

          <Button
            onClick={generateImage}
            disabled={isGenerating || !prompt.trim()}
            className="w-full gradient-primary text-primary-foreground font-semibold h-12"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Yaratilmoqda...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                {editImage ? "Tahrirlash" : "Rasm yaratish"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedImage && (
        <Card className="glass animate-fade-in overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-display">
              <span className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-secondary" />
                Yaratilgan rasm
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadImage}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Yuklab olish
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img
                src={generatedImage}
                alt={lastPrompt}
                className="w-full object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Prompt:</span> {lastPrompt}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImageGenerator;
