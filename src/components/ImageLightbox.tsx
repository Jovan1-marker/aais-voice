import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ImageLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImageLightbox = ({ src, alt, open, onOpenChange }: ImageLightboxProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-background/95 border-none shadow-2xl">
      <VisuallyHidden>
        <DialogTitle>Image Preview</DialogTitle>
      </VisuallyHidden>
      <img
        src={src}
        alt={alt}
        className="w-full h-full max-h-[85vh] object-contain rounded-md"
      />
    </DialogContent>
  </Dialog>
);

export default ImageLightbox;
