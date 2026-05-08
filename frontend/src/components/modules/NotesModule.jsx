import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Send, Trash2, Copy, Check, Mail, Phone } from 'lucide-react';

export const NotesModule = ({ notes, event, user, eventId, fetchEventData, API }) => {
  const [newNote, setNewNote] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareContent, setShareContent] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await axios.post(`${API}/notes`, { content: newNote, event_id: eventId });
      toast.success('Nota creada');
      setNewNote('');
      fetchEventData();
    } catch (error) {
      toast.error('Error');
    }
  };

  const handleDelete = async (noteId) => {
    try {
      await axios.delete(`${API}/notes/${noteId}`);
      toast.success('Nota eliminada');
      fetchEventData();
    } catch (error) {
      toast.error('Error');
    }
  };

  const openShareModal = (content) => {
    setShareContent(content);
    setCopied(false);
    setShareModalOpen(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareContent);
      setCopied(true);
      toast.success('Texto copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success('Texto copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(shareContent)}`;
  const emailSubject = encodeURIComponent(`Nota de ${event?.name || event?.title || 'Evento'}`);
  const emailBody = encodeURIComponent(shareContent);
  const mailtoUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-playfair font-bold">Comunicación</h3>

      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-md" data-testid="share-note-modal">
          <DialogHeader>
            <DialogTitle className="font-playfair">Compartir Nota</DialogTitle>
            <p className="text-sm text-gray-500">Elige cómo quieres compartir esta nota</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 border">
              <p className="text-sm text-gray-700 whitespace-pre-wrap" data-testid="share-note-content">{shareContent}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="w-full justify-start gap-2"
                data-testid="copy-note-btn"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar al portapapeles'}
              </Button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-start gap-2 w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                data-testid="share-whatsapp-link"
              >
                <Phone className="h-4 w-4 text-green-600" />
                Enviar por WhatsApp Web
              </a>
              <a
                href={mailtoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-start gap-2 w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                data-testid="share-email-link"
              >
                <Mail className="h-4 w-4 text-blue-600" />
                Enviar por Email
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1"
          data-testid="note-input"
        />
        <Button type="submit" className="bg-[#D4AF37] hover:bg-[#C9A961]" data-testid="send-note-btn">
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <div className="space-y-3">
        {notes.map((note) => (
          <Card key={note.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#D4AF37]">{note.author_name}</p>
                  <p className="text-gray-700 mt-2">{note.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(note.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openShareModal(note.content)}
                    title="Compartir nota"
                    data-testid={`share-note-${note.id}`}
                  >
                    <Send className="h-4 w-4 text-[#D4AF37]" />
                  </Button>
                  {note.author_id === user.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
