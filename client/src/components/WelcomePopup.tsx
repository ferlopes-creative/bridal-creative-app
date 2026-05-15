import BrandLogo from "@/components/BrandLogo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const serifFont = "'Cormorant Garamond', 'Cinzel', 'Times New Roman', serif";
const sansFont = "'Montserrat', 'Lato', 'Arial', sans-serif";

type WelcomePopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logoUrl?: string | null;
};

export default function WelcomePopup({ open, onOpenChange, logoUrl }: WelcomePopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-[min(100%-2rem,22rem)] gap-0 overflow-hidden rounded-2xl border border-[#e9e9e6] bg-[#F9F9F7] p-0 shadow-[0_20px_50px_rgba(0,0,0,0.12)] sm:max-w-md"
      >
        <div className="relative px-6 pt-8 pb-6 sm:px-8 sm:pt-10 sm:pb-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, #6B7459 0%, transparent 45%), radial-gradient(circle at 80% 80%, #aeb6a1 0%, transparent 40%)",
            }}
            aria-hidden
          />

          <div className="relative flex flex-col items-center text-center">
            <BrandLogo
              src={logoUrl}
              className="mb-4 h-[72px] w-auto max-w-[120px] sm:mb-5 sm:h-[80px] sm:max-w-[132px]"
            />

            <DialogTitle
              className="text-[22px] leading-tight font-medium tracking-[0.14em] text-[#6B7459] sm:text-[26px]"
              style={{ fontFamily: serifFont }}
            >
              BEM-VINDA
            </DialogTitle>

            <DialogDescription
              className="mt-3 max-w-[280px] text-[11px] leading-relaxed font-light tracking-[0.06em] text-[#7B776D] sm:mt-4 sm:text-[12px]"
              style={{ fontFamily: sansFont }}
            >
              Sua conta foi criada com sucesso. Explore seus produtos, bônus e tudo o que preparamos para o seu
              casamento.
            </DialogDescription>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-6 inline-flex h-9 min-w-[168px] items-center justify-center rounded-lg px-6 text-[14px] font-medium text-white transition-opacity hover:opacity-90 sm:mt-8 sm:h-10 sm:text-[15px]"
              style={{
                backgroundColor: "#6B7459",
                fontFamily: serifFont,
                letterSpacing: "0.12em",
              }}
            >
              COMEÇAR
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
