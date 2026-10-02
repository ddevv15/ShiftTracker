import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';

const MotionDiv = motion.div;

// Sheet spring: damping ~0.8 / response ~0.3 (Apple's drawer values)
const SHEET_SPRING = { type: 'spring', bounce: 0.15, duration: 0.35 };
const FADE = { duration: 0.2 };

// Where a flick would come to rest (Apple's momentum projection)
const project = (velocity, decelerationRate = 0.998) =>
  ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);

// Bottom sheet: grab the handle to drag, flick down to dismiss, and it can be
// re-grabbed mid-flight. Reduced motion swaps the slide for a cross-fade.
const Sheet = ({ open, onClose, title, children, footer, dismissible = true }) => {
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape' && dismissible) onClose(); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, dismissible]);

  const handleDragEnd = (_, info) => {
    const height = panelRef.current?.offsetHeight || 600;
    const projected = info.offset.y + project(info.velocity.y);
    if (dismissible && projected > height * 0.35) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="presentation">
          <MotionDiv
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
            onClick={dismissible ? onClose : undefined}
          />
          <MotionDiv
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="sheet-material relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-3xl outline-none"
            initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={reduceMotion ? FADE : SHEET_SPRING}
            drag={reduceMotion || !dismissible ? false : 'y'}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.06, bottom: 1 }}
            dragTransition={{ bounceStiffness: 500, bounceDamping: 40 }}
            onDragEnd={handleDragEnd}
          >
            {/* Grab area: handle + title */}
            <div
              className="pt-2.5 pb-3 px-5 touch-none cursor-grab active:cursor-grabbing select-none"
              onPointerDown={(e) => dismissible && !reduceMotion && dragControls.start(e)}
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
              {title && (
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h2>
              )}
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
            {footer && (
              <div className="px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-black/5 dark:border-white/10">
                {footer}
              </div>
            )}
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Sheet;
