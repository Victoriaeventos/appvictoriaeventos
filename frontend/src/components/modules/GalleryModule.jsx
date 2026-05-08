import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';

export const GalleryModule = ({ galleries, eventId, fetchEventData, API }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await axios.post(`${API}/gallery/generate`, { generated_prompt: prompt, event_id: eventId });
      toast.success('Imagen generada correctamente');
      setDialogOpen(false);
      setPrompt('');
      fetchEventData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al generar imagen');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-playfair font-bold">Galería de Inspiración</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#D4AF37] hover:bg-[#C9A961]" data-testid="generate-image-btn">
              <Sparkles className="mr-2 h-4 w-4" /> Generar con IA
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-playfair">Generar Imagen con IA</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <Label>Describe la imagen que quieres generar</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  required
                  placeholder="Ej: Una mesa elegante con decoración floral en tonos beige y dorado..."
                  rows={4}
                />
              </div>
              <Button type="submit" disabled={generating} className="w-full bg-[#D4AF37] hover:bg-[#C9A961]">
                {generating ? 'Generando... (1 minuto aprox.)' : 'Generar Imagen'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {galleries.map((gallery) => (
          <Card key={gallery.id} className="overflow-hidden">
            <img
              src={`data:image/png;base64,${gallery.image_base64}`}
              alt={gallery.generated_prompt}
              className="w-full h-64 object-cover"
            />
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">{gallery.generated_prompt}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
