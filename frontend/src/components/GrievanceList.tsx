import React, { useEffect, useState } from "react";
import axios from "axios";

// Define the type for the grievance record
interface Grievance {
  id: number;
  source: string;
  edit_source?: string | null; // optional or can be null
  sentiment_anaylis?: string | null; // optional or can be null
}

const GrievanceList: React.FC = () => {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGrievances = async () => {
      try {
        const response = await axios.get<Grievance[]>(
          "http://localhost:5000/get_grievance_records"
        );
        setGrievances(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchGrievances();
  }, []);

  if (loading) return <p className="text-center">Loading...</p>;
  if (error) return <p className="text-red-500 text-center">Error: {error}</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Grievance Records</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-200 text-gray-700">
              <th className="py-3 px-5 border-b">ID</th>
              <th className="py-3 px-5 border-b">Source</th>
              <th className="py-3 px-5 border-b">Edit Source</th>
              <th className="py-3 px-5 border-b">Sentiment Analysis</th>
            </tr>
          </thead>
          <tbody>
            {grievances.map((grievance) => (
              <tr key={grievance.id} className="hover:bg-gray-100 dark:text-black">
                <td className="py-2 px-5 border-b dark:text-black">{grievance.id}</td>
                <td className="py-2 px-5 border-b dark:text-black">{grievance.source}</td>
                <td className="py-2 px-5 border-b dark:text-black">
                  {grievance.edit_source || "None"}
                </td>
                <td className="py-2 px-5 border-b">
                  {grievance.sentiment_anaylis || "None"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GrievanceList;
