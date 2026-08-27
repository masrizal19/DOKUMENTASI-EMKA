export const getBgTransitionClasses = (isActive: boolean, mode: string, offset: number) => {
  const base = "absolute inset-0 w-full h-full transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]";
  
  // if not active, how should it hide?
  switch(mode) {
    case "Fade":
      return `${base} ${isActive ? "opacity-100 z-10" : "opacity-0 z-0"}`;
    case "Crossfade":
      return `${base} ${isActive ? "opacity-100 z-10" : "opacity-0 z-0"}`;
    case "Slide": // Slide left/right
      return `${base} ${isActive ? "opacity-100 translate-x-0 z-10" : (offset > 0 ? "opacity-0 translate-x-full z-0" : "opacity-0 -translate-x-full z-0")}`;
    case "Slide Up":
      return `${base} ${isActive ? "opacity-100 translate-y-0 z-10" : "opacity-0 translate-y-full z-0"}`;
    case "Slide Down":
      return `${base} ${isActive ? "opacity-100 translate-y-0 z-10" : "opacity-0 -translate-y-full z-0"}`;
    case "Zoom":
      return `${base} ${isActive ? "opacity-100 scale-100 z-10" : "opacity-0 scale-50 z-0"}`;
    case "Zoom + Fade":
      return `${base} ${isActive ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0"}`;
    case "Blur + Fade":
      return `${base} ${isActive ? "opacity-100 blur-none z-10" : "opacity-0 blur-xl z-0"}`;
    case "Ken Burns":
      // Ken burns needs a slow animation when active
      return `${base} ${isActive ? "opacity-100 scale-110 z-10 duration-[20000ms] ease-linear" : "opacity-0 scale-100 z-0 duration-[1200ms]"}`;
    case "Parallax":
      return `${base} ${isActive ? "opacity-100 translate-x-0 z-10" : (offset > 0 ? "opacity-0 translate-x-[20%] z-0" : "opacity-0 -translate-x-[20%] z-0")}`;
    case "Cinematic":
      return `${base} ${isActive ? "opacity-100 scale-100 rotate-0 z-10 duration-[2000ms]" : "opacity-0 scale-110 rotate-1 z-0"}`;
    default:
      return `${base} ${isActive ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0"}`;
  }
}
