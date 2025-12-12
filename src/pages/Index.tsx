import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import ImageGenerator from "@/components/ImageGenerator";
import ImageGallery from "@/components/ImageGallery";
import { Loader2 } from "lucide-react";

interface EditingImage {
  id: string;
  imageUrl: string;
  prompt: string;
}

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [editingImage, setEditingImage] = useState<EditingImage | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleImageGenerated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEditImage = (image: EditingImage) => {
    setEditingImage(image);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearEdit = () => {
    setEditingImage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="max-w-2xl mx-auto">
          <ImageGenerator
            onImageGenerated={handleImageGenerated}
            editImage={editingImage}
            onClearEdit={handleClearEdit}
          />
        </div>

        <div className="max-w-5xl mx-auto">
          <ImageGallery
            onEditImage={handleEditImage}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
