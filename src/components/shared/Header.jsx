import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function Header() {
    return(
        <header className="flex justify-between items-center px-4 py-2">
            <div className="flex items-center gap-3">
                <Image src="/images/icon.png" alt="logo" width={32} height={32} priority={true} />
                <span className="text-2xl font-medium text-gray-300">SentimentLab</span>
                <Badge variant="outline" className="hidden sm:inline-flex text-gray-300 border-gray-600/30">PREVIEW</Badge>
            </div>

            <div className="flex items-center">
                <Link href="https://github.com/maksimilijankatavic">
                    <Button variant="outline" className="cursor-pointer bg-transparent border-gray-600/30 text-gray-300 hover:bg-gray-700/60 hover:border-gray-500/50 hover:text-white transition-all duration-200">
                    <Image src="/images/github.png" alt="github logo" width={16} height={16} priority={true} />
                    GitHub
                    </Button>
                </Link>
            </div>
        </header>
    );
}
