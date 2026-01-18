import { useState } from 'react';
import { useData } from '../context/DataContext';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

// Default tags to make clicking fast
const PRESET_TAGS = ["Quick", "Healthy", "Weekend", "Takeout", "Cheat Meal"];

export default function ManageMeals() {
  const { meals, loading } = useData();
  const [newName, setNewName] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle tag selection
  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddMeal = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      // Add to Firestore
      await addDoc(collection(db, "meals"), {
        name: newName,
        tags: selectedTags,
        last_eaten: null, // Hasn't been eaten yet
        created_at: serverTimestamp()
      });
      
      // Reset form
      setNewName('');
      setSelectedTags([]);
    } catch (error) {
      console.error("Error adding meal:", error);
      alert("Failed to add meal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remove this meal forever?")) {
      await deleteDoc(doc(db, "meals", id));
    }
  };

  if (loading) return <div className="p-8 text-center">Loading meals...</div>;

  return (
    <div className="pb-20">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Your Menu</h1>

      {/* --- ADD MEAL FORM --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Add New Option</h2>
        <form onSubmit={handleAddMeal}>
          
          {/* Name Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-500 mb-1">Meal Name</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Chicken Stir Fry"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Tags Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag) 
                      ? 'bg-orange-100 text-orange-700 border-orange-200 border'
                      : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!newName.trim() || isSubmitting}
            className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? 'Saving...' : 'Add to Menu'}
          </button>
        </form>
      </div>

      {/* --- EXISTING MEALS LIST --- */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Current Options ({meals.length})</h2>
        <div className="space-y-3">
          {meals.map(meal => (
            <div key={meal.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">{meal.name}</h3>
                <div className="flex gap-1 mt-1">
                  {meal.tags?.map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => handleDelete(meal.id)}
                className="text-gray-400 hover:text-red-500 p-2"
              >
                {/* Trash Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          ))}

          {meals.length === 0 && (
            <p className="text-center text-gray-400 italic mt-8">
              No meals yet. Add a few favorites above!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}