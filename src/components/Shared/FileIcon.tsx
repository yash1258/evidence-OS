"use client";
import React from 'react';
import { FileText, Headphones, Image as ImageIcon } from 'lucide-react';

interface FileIconProps {
    type: 'pdf' | 'audio' | 'image' | string;
    size?: number;
    className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ 
    type, 
    size = 16, 
    className = "" 
}) => {
    switch (type) {
        case 'pdf': return <FileText size={size} className={className} />;
        case 'audio': return <Headphones size={size} className={className} />;
        case 'image': return <ImageIcon size={size} className={className} />;
        default: return <FileText size={size} className={className} />;
    }
};
