import { Code, Download, Plug, Server } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex justify-end p-6">
        <a href="https://github.com/usamaasfar/alpaca" target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon">
            <GitHubIcon />
          </Button>
        </a>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="Alpaca" width={64} height={64} />
          <h1 className="text-xl font-semibold tracking-tight">Alpaca</h1>
          <p className="text-sm text-muted-foreground">Connect and chat with all your apps in one place.</p>
        </div>

        <a href="https://github.com/usamaasfar/alpaca/releases/latest">
          <Button size="lg">
            Download for macOS <Download />
          </Button>
        </a>

        <div className="mt-4 flex flex-wrap justify-center gap-3 px-6">
          <Badge variant="outline">
            <Code /> Open Source
          </Badge>
          <Badge variant="outline">
            <Plug /> Any Provider
          </Badge>
          <Badge variant="outline">
            <Server /> 3000+ MCP Servers
          </Badge>
        </div>
      </main>

      <footer className="p-6 text-center text-sm text-muted-foreground">&copy; 2026 Alpaca</footer>
    </div>
  );
}
