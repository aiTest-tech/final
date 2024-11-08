import React from "react";
import { Button } from "./ui/button"; // Adjust the path as necessary

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  initialText: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, initialText }) => {
  const [text, setText] = React.useState<string>(initialText);

  React.useEffect(() => {
    setText(initialText); // Update local text when initialText changes
  }, [initialText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg w-3/4 h-3/4 max-w-3xl max-h-3/4 overflow-y-auto">
        <h2 className="text-lg font-semibold">Edit Transcription</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="border p-2 w-full h-48 resize-none"
        />
        <div className="flex justify-end mt-2">
          <Button onClick={() => {
            onSubmit(text);
            onClose(); // Close modal on submit
          }} className="bg-blue-500 text-white">Save</Button>
          <Button onClick={onClose} className="bg-gray-500 text-white ml-2">Cancel</Button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
