// @ts-nocheck
import { useState, useRef } from "react";
import React from "react";
import axios from "axios";
import { CgDarkMode } from "react-icons/cg";
import { BsFillMicFill, BsFillStopFill } from "react-icons/bs";
// import { Button } from "./components/ui/button"; // Adjust this path as needed
import { IoMoon, IoSunny } from "react-icons/io5";
// import Navbar from "./components/Navbar";
// import Footer from "./components/Footer";
// import Loader from "./components/Loader";
// import GrievanceList from "./components/GrievanceList";
// import Modal from "./components/Modal"; // Import the Modal component

// import Button from "@/components/Button";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import GrievanceList from "@/components/GrievanceList";
import Modal from "@/components/Modal";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type Language = 'gu' | 'en';

const AudioRecorder: React.FC = () => {
  const [dark, setDark] = useState(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<string[]>([]);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [editedTranscription, setEditedTranscription] = useState<string>(""); // Initialize as empty string
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [transcriptionId, setTranscriptionId] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<string>('');
  const [language, setLanguage] = useState<Language>('gu');

  // Toggle Dark Mode
  const darkModeHandler = () => {
    setDark(!dark);
    document.body.classList.toggle("dark");
  };

  // Start Audio Recording
  const startRecording = async () => {
    try {
      setIsRecording(true);
      audioChunks.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);

      mediaRecorder.current.ondataavailable = (event: BlobEvent) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        const wavBlob = await convertWebmToWav(audioBlob);
        const url = URL.createObjectURL(wavBlob);
        setAudioUrl(url);
        setRecordings((prev) => [...prev, url]);
        await sendAudioToBackend(wavBlob);
      };

      mediaRecorder.current.start();
    } catch (error) {
      console.error("Error starting audio recording:", error);
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  // Convert WebM to WAV
  const convertWebmToWav = async (webmBlob: Blob): Promise<Blob> => {
    const audioContext = new AudioContext();
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const wavBuffer = audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: "audio/wav" });
  };

  // Helper function to convert AudioBuffer to WAV
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // 1 for PCM (uncompressed)
    const bitDepth = 16;

    const wavData = new DataView(new ArrayBuffer(44 + buffer.length * 2));
    let offset = 0;

    // Write WAV header
    writeString(wavData, offset, "RIFF");
    offset += 4;
    wavData.setUint32(offset, 36 + buffer.length * 2, true);
    offset += 4;
    writeString(wavData, offset, "WAVE");
    offset += 4;
    writeString(wavData, offset, "fmt ");
    offset += 4;
    wavData.setUint32(offset, 16, true);
    offset += 4; // Subchunk1Size
    wavData.setUint16(offset, format, true);
    offset += 2; // AudioFormat
    wavData.setUint16(offset, numberOfChannels, true);
    offset += 2;
    wavData.setUint32(offset, sampleRate, true);
    offset += 4;
    wavData.setUint32(offset, sampleRate * numberOfChannels * (bitDepth / 8), true);
    offset += 4; // ByteRate
    wavData.setUint16(offset, numberOfChannels * (bitDepth / 8), true);
    offset += 2; // BlockAlign
    wavData.setUint16(offset, bitDepth, true);
    offset += 2;
    writeString(wavData, offset, "data");
    offset += 4;
    wavData.setUint32(offset, buffer.length * 2, true);
    offset += 4; // Subchunk2Size

    // Write PCM data
    const channelData = buffer.getChannelData(0);
    let i = 0;
    while (i < channelData.length) {
      wavData.setInt16(offset, channelData[i++] * 0x7fff, true);
      offset += 2;
    }

    return wavData.buffer;
  };

  // Helper function to write string to DataView
  const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // Send audio to backend
  const sendAudioToBackend = async (audioBlob: Blob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob);
      formData.append("lang", language)

      const response = await axios.post("http://10.10.2.179:6162/process_audio", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Response from backend:", response.data);

      const transcriptionText = response.data.text || "No transcription available";
      const transcriptionId = response.data.id; // Get the transcription ID from the response

      setTranscription(transcriptionText);
      setEditedTranscription(transcriptionText); // Set the edited transcription immediately
      setTranscriptionId(transcriptionId); // Store the transcription ID
    } catch (error) {
      console.error("Error sending audio to backend:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendRating = async () => {
    if (!selectedRating) {
      checkRatingSelection();
    } else {
      try {
        const response = await axios.post(
          "http://10.10.2.179:6162/acc_rating",
          {
            id: transcriptionId,      // Sending the id in the request body
            rating: selectedRating,  // Sending the rating in the request body
          },
          {
            headers: {
              "Content-Type": "application/json", // Indicate that we're sending JSON
            },
          }
        );

        // Handle the response if needed
        console.log(response.data);
        handleRefresh()
      } catch (error) {
        // Handle errors, logging or performing actions
        console.error("Error sending rating:", error);
        handleRefresh()
      }
    }
  };



  // Handle transcription edit
  const handleEdit = () => {
    if (!selectedRating) {
      checkRatingSelection();
    } else {
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalSubmit = async (editedText: string) => {
    if (transcriptionId !== null) {
      try {
        const response = await axios.post("http://10.10.2.179:6162/submit_audio", {
          id: transcriptionId,
          text: editedText,
        });
        console.log("API response:", response.data);
        setTranscription(editedText); // Update transcription after successful submission
        handleRefresh();
      } catch (error) {
        console.error("Error submitting edited transcription:", error);
      }
    }
  };

  const handleRemoveTranscription = async () => {
    if (transcriptionId !== null) {
      try {
        await axios.post("http://10.10.2.179:8000/remove_audio", { id: transcriptionId });
        setTranscription(null); // Clear transcription from state
        setEditedTranscription(""); // Reset edited transcription
        setTranscriptionId(null);
      } catch (error) {
        console.error("Error removing transcription:", error);
      }
    }
  };

  const handleLanguageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLanguage(event.target.value as Language);
  };

  const handleRatingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedRating(event.target.value); // Update state with the selected value
  };

  const handleRefresh = () => {
    window.location.reload(); // This reloads the page
  };

  const checkRatingSelection = () => {
    if (!selectedRating) {
      toast.error('Please Rate the Accuracy!', {
        autoClose: 3000,
      });
    }
  };

  return (
    <>
      <div>
        <Navbar />
      </div>
      <ToastContainer />
      <div className="bg-white dark:bg-black">
        <button onClick={darkModeHandler} className="mt-10 absolute right-10">
          {dark ? <IoSunny size={30} /> : <CgDarkMode size={30} />}
        </button>
      </div>
      <div>
        <div className="dark:bg-black w-[100%] h-[88vh] flex justify-center items-center bg-[url('/cm-banner.jpg')] bg-no-repeat bg-contain bg-center">
          {
            transcriptionId && (
              <>
                <div className="flex flex-col gap-2 absolute left-[10%] bg-white text-black w-[250px]">
                  <h1 className="text-center font-extrabold text-xl">Accuracy Rating</h1>
                  {/* Step 3: Render radio buttons */}
                  {/* 90-100% Option */}
                  <div className="inline-flex items-center">
                    <label className="relative flex cursor-pointer items-center rounded-full p-3" htmlFor="90to100">
                      <input
                        name="rating"
                        type="radio"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all"
                        id="90to100"
                        value="90-100%"
                        checked={selectedRating === '90-100%'}
                        onChange={handleRatingChange}
                      />
                      <span className="absolute bg-slate-800 w-3 h-3 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </label>
                    <label className="text-slate-600 cursor-pointer text-sm" htmlFor="90to100">
                      90-100%
                    </label>
                  </div>

                  {/* 80-90% Option */}
                  <div className="inline-flex items-center">
                    <label className="relative flex cursor-pointer items-center rounded-full p-3" htmlFor="80to90">
                      <input
                        name="rating"
                        type="radio"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all"
                        id="80to90"
                        value="80-90%"
                        checked={selectedRating === '80-90%'}
                        onChange={handleRatingChange}
                      />
                      <span className="absolute bg-slate-800 w-3 h-3 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </label>
                    <label className="text-slate-600 cursor-pointer text-sm" htmlFor="80to90">
                      80-90%
                    </label>
                  </div>

                  {/* 70-80% Option */}
                  <div className="inline-flex items-center">
                    <label className="relative flex cursor-pointer items-center rounded-full p-3" htmlFor="70to80">
                      <input
                        name="rating"
                        type="radio"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all"
                        id="70to80"
                        value="70-80%"
                        checked={selectedRating === '70-80%'}
                        onChange={handleRatingChange}
                      />
                      <span className="absolute bg-slate-800 w-3 h-3 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </label>
                    <label className="text-slate-600 cursor-pointer text-sm" htmlFor="70to80">
                      70-80%
                    </label>
                  </div>

                  {/* 60-70% Option */}
                  <div className="inline-flex items-center">
                    <label className="relative flex cursor-pointer items-center rounded-full p-3" htmlFor="60to70">
                      <input
                        name="rating"
                        type="radio"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all"
                        id="60to70"
                        value="60-70%"
                        checked={selectedRating === '60-70%'}
                        onChange={handleRatingChange}
                      />
                      <span className="absolute bg-slate-800 w-3 h-3 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </label>
                    <label className="text-slate-600 cursor-pointer text-sm" htmlFor="60to70">
                      60-70%
                    </label>
                  </div>

                  {/* 50-60% Option */}
                  <div className="inline-flex items-center">
                    <label className="relative flex cursor-pointer items-center rounded-full p-3" htmlFor="50to60">
                      <input
                        name="rating"
                        type="radio"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all"
                        id="50to60"
                        value="50-60%"
                        checked={selectedRating === '50-60%'}
                        onChange={handleRatingChange}
                      />
                      <span className="absolute bg-slate-800 w-3 h-3 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </label>
                    <label className="text-slate-600 cursor-pointer text-sm" htmlFor="50to60">
                      50-60%
                    </label>
                  </div>

                  {/* 40-50% Option */}
                  <div className="inline-flex items-center">
                    <label className="relative flex cursor-pointer items-center rounded-full p-3" htmlFor="40to50">
                      <input
                        name="rating"
                        type="radio"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all"
                        id="40to50"
                        value="40-50%"
                        checked={selectedRating === '40-50%'}
                        onChange={handleRatingChange}
                      />
                      <span className="absolute bg-slate-800 w-3 h-3 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </label>
                    <label className="text-slate-600 cursor-pointer text-sm" htmlFor="40to50">
                      40-50%
                    </label>
                  </div>

                  {/* 30-40% Option */}
                  <div className="inline-flex items-center">
                    <label className="relative flex cursor-pointer items-center rounded-full p-3" htmlFor="30to40">
                      <input
                        name="rating"
                        type="radio"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all"
                        id="30to40"
                        value="30-40%"
                        checked={selectedRating === '30-40%'}
                        onChange={handleRatingChange}
                      />
                      <span className="absolute bg-slate-800 w-3 h-3 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </label>
                    <label className="text-slate-600 cursor-pointer text-sm" htmlFor="30to40">
                      30-40%
                    </label>
                  </div>

                  {/* 20-30% Option */}
                  <div className="inline-flex items-center">
                    <label className="relative flex cursor-pointer items-center rounded-full p-3" htmlFor="20to30">
                      <input
                        name="rating"
                        type="radio"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all"
                        id="20to30"
                        value="20-30%"
                        checked={selectedRating === '20-30%'}
                        onChange={handleRatingChange}
                      />
                      <span className="absolute bg-slate-800 w-3 h-3 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </label>
                    <label className="text-slate-600 cursor-pointer text-sm" htmlFor="20to30">
                      20-30%
                    </label>
                  </div>

                  {/* 10-20% Option */}
                  <div className="inline-flex items-center">
                    <label className="relative flex cursor-pointer items-center rounded-full p-3" htmlFor="10to20">
                      <input
                        name="rating"
                        type="radio"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all"
                        id="10to20"
                        value="10-20%"
                        checked={selectedRating === '10-20%'}
                        onChange={handleRatingChange}
                      />
                      <span className="absolute bg-slate-800 w-3 h-3 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </label>
                    <label className="text-slate-600 cursor-pointer text-sm" htmlFor="10to20">
                      10-20%
                    </label>
                  </div>
                </div>
              </>
            )
          }

          <div className="flex flex-col items-center p-6 bg-white shadow-lg rounded-lg max-w-md dark:text-[#FBB917] mx-auto md:w-[1000px] fixed top-[55px] h-[400px] overflow-auto">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="language"
                  value="gu"
                  checked={language === 'gu'}
                  onChange={handleLanguageChange}
                  className="form-radio text-blue-600"
                />
                <span>Gujarati</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="language"
                  value="en"
                  checked={language === 'en'}
                  onChange={handleLanguageChange}
                  className="form-radio text-blue-600"
                />
                <span>English</span>
              </label>
            </div>
            <h2 className="text-4xl font-semibold mb-4 dark:text-orange-500">Audio Recorder</h2>
            <div className="flex justify-center items-center mb-4">
              {isRecording ? (
                <Button className="bg-red-500 dark:bg-black text-white flex items-center" onClick={stopRecording}>
                  <BsFillStopFill className="mr-2" /> Stop Recording
                </Button>
              ) : (
                <Button className="bg-orange-500 dark:bg-orange-500 dark:hover:bg-black text-white flex items-center" onClick={startRecording}>
                  <BsFillMicFill size={500} className="mr-2 text-white" /> Start Recording
                </Button>
              )}
            </div>
            {loading ? (
              <Loader />
            ) : (
              <>
                {audioUrl && (
                  <audio controls className="w-full mb-4">
                    <source src={audioUrl} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                )}
                {transcription && (
                  <div className="w-full mt-4">
                    <div className="text-black dark:text-black">
                      <div className="w-full border-primary p-2 text-black text-xl">
                        {transcription}
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={handleEdit} className="bg-orange-500 text-white dark:bg-black dark:text-white">Edit</Button>
                        <Button onClick={sendRating} className="bg-orange-500 text-white dark:bg-black dark:text-white">Submit</Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {selectedRating ? null : <ToastContainer />}
      <div>
        <Footer />
      </div>

      {/* Modal for editing transcription */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        onRemove={handleRemoveTranscription}
        initialText={editedTranscription}
      />
    </>
  );
};

const HomePage: React.FC = () => {
  return (
    <div>
      <AudioRecorder />
    </div>
  );
};

export default HomePage;
