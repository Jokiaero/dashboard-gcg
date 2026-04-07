"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/shared/ui/alert-dialog";

interface Props {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function DeleteConfirmDialog({ open, onClose, onConfirm }: Props) {
    return (
        <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Data?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Data ini akan dihapus permanen dan tidak bisa dikembalikan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        style={{ backgroundColor: "#dc2626", color: "#fff" }}
                    >
                        Hapus
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
