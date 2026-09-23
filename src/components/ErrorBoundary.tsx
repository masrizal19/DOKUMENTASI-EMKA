import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleGoHome = () => {
    window.location.href = "/";
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#110e09] text-[#eae1d8] flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-8 rounded-sm border border-red-500/30 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-bold text-[#eae1d8]">Terjadi Kendala Teknis</h2>
              <p className="font-body text-xs text-[#9b8f7f] leading-relaxed">
                {this.state.error?.message || "Aplikasi mengalami kendala saat memuat halaman."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 bg-[#f6c374] hover:bg-[#d8a85c] text-[#17130e] font-subheading text-xs tracking-wider uppercase font-bold py-2.5 px-4 rounded-sm transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Muat Ulang
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 bg-[#17130e] hover:bg-[#39342e]/30 border border-[#4f4538]/40 text-[#eae1d8] font-subheading text-xs tracking-wider uppercase py-2.5 px-4 rounded-sm transition-all cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" /> Ke Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
