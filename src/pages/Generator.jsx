import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Generator() {
  const { meals, weekPlan, HOUSEHOLD_ID } = useData();
  
  // State for the "Slot Machine"
  const [suggestion, setSuggestion] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const [selectedDays, setSelectedDays] = useState([]);
  
  // State for Filters
  const [filterTag, setFilterTag] = useState(null); // Null = All
  const availableTags = [...new Set(meals.flatMap(m => m.tags || []))];

  // State for "Locking it in"
  const [showDaySelector, setShowDaySelector] = useState(false);

  // 1. The Logic: Pick a random meal
  const spinTheWheel = () => {
    setIsSpinning(true);
    setShowDaySelector(false); // Close modal if open
    
    // Filter first
    let candidates = meals;
    if (filterTag) {
      candidates = meals.filter(m => m.tags && m.tags.includes(filterTag));
    }

    if (candidates.length === 0) {
      alert("No meals found with that tag!");
      setIsSpinning(false);
      return;
    }

    // Fake delay for "Slot Machine" effect
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      setSuggestion(candidates[randomIndex]);
      setIsSpinning(false);
    }, 400);
  };

  // 2. The Logic: Save to Database
  const lockInMeal = async (day) => {
    if (!suggestion) return;

    try {
      const householdRef = doc(db, "households", HOUSEHOLD_ID);
      
      // Update specific day in the week_plan object
      await updateDoc(householdRef, {
        [`week_plan.${day}`]: suggestion.name
      });

      setShowDaySelector(false);
      setSuggestion(null); // Clear suggestion after locking
    } catch (error) {
      console.error("Error locking meal:", error);
    }
  };

  // 3. Clear a day
  const clearDay = async (day) => {
    const householdRef = doc(db, "households", HOUSEHOLD_ID);
    await updateDoc(householdRef, {
      [`week_plan.${day}`]: null // Delete from DB
    });
  };

  return (
    <div className="pb-24">
      {/* --- HEADER --- */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">What's for Dinner?</h1>
        <p className="text-gray-500 text-sm">Don't overthink it.</p>
      </div>

      {/* --- FILTERS --- */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
        <button 
          onClick={() => setFilterTag(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${
            filterTag === null 
            ? 'bg-gray-800 text-white border-gray-800' 
            : 'bg-white text-gray-600 border-gray-300'
          }`}
        >
          All
        </button>
        {availableTags.map(tag => (
          <button 
            key={tag} 
            onClick={() => setFilterTag(tag === filterTag ? null : tag)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${
              filterTag === tag 
              ? 'bg-orange-500 text-white border-orange-500' 
              : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* --- WEEKLY PLAN OVERVIEW --- */}
      <div>
        <h3 className="text-lg font-bold text-gray-700 mb-4">This Week's Plan</h3>
        <div className="space-y-3">
        {/*}
          {DAYS.map(day => (
            <div key={day} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center font-bold text-gray-400 text-xs">
                  {day.slice(0, 3).toUpperCase()}
                </div>
                <div>
                  {weekPlan[day] ? (
                    <span className="font-bold text-gray-800">{weekPlan[day]}</span>
                  ) : (
                    <span className="text-gray-400 italic text-sm">Not planned</span>
                  )}
                </div>
              </div>
              
              {weekPlan[day] && (
                <button 
                  onClick={() => clearDay(day)}
                  className="text-gray-300 hover:text-red-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        */}
          {DAYS.map(day => {
            const hasMeal = !!weekPlan[day];
            const isSelected = selectedDays.includes(day); // Check if this day is highlighted
            
            const toggleSelection = () => {
              if (isSelected) {
                setSelectedDays(selectedDays.filter(d => d !== day));
              } else {
                setSelectedDays([...selectedDays, day]);
                
                // OPTIONAL: If you still want it to pick a meal immediately when highlighted:
                if (!hasMeal) {
                  const existingMeals = Object.values(weekPlan).filter(m => m);
                  if (existingMeals.length > 0) {
                    const randomMeal = existingMeals[Math.floor(Math.random() * existingMeals.length)];
                    updateDay(day, randomMeal);
                  }
                }
              }
            };

            return (
              <div 
                key={day} 
                onClick={toggleSelection}
                className={`
                  flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer
                  ${isSelected || hasMeal 
                    ? 'bg-blue-50 border-blue-300 shadow-md ring-1 ring-blue-300' 
                    : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'}
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Day Circle */}
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-colors
                    ${isSelected || hasMeal ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}
                  `}>
                    {day.slice(0, 3).toUpperCase()}
                  </div>
                  
                  {/* Plan Text */}
                  <div>
                    {hasMeal ? (
                      <span className="font-bold text-blue-900">{weekPlan[day]}</span>
                    ) : (
                      <span className="text-gray-400 italic text-sm">
                        {isSelected ? 'Ready to plan...' : 'Click to select day'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Clear Button */}
                <div className="flex items-center">
                  {hasMeal && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); 
                        clearDay(day);
                        // Also remove highlight when clearing? Un-comment next line if so:
                        // setSelectedDays(selectedDays.filter(d => d !== day));
                      }}
                      className="p-1 text-blue-400 hover:text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- THE GENERATOR CARD --- */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center min-h-[200px] flex flex-col justify-center items-center mb-8 relative overflow-hidden">
        
        {/* Background Decorative Pattern */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500"></div>

        {suggestion ? (
          <div className="animate-fade-in">
            <h2 className="text-3xl font-extrabold text-gray-800 mb-2">{suggestion.name}</h2>
            <div className="flex justify-center gap-2 mb-6">
              {suggestion.tags?.map(t => (
                <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">{t}</span>
              ))}
            </div>

            {/* Action Buttons */}
            {!showDaySelector ? (
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={spinTheWheel}
                  className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Nah, Spin Again
                </button>
                <button 
                  onClick={() => setShowDaySelector(true)}
                  className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all transform hover:scale-105"
                >
                  Let's Eat This
                </button>
              </div>
            ) : (
              <div className="animate-fade-in-up">
                <p className="text-sm font-bold text-gray-500 mb-3">Which day?</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      onClick={() => lockInMeal(day)}
                      className="px-3 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-sm font-bold hover:bg-orange-100"
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setShowDaySelector(false)}
                  className="mt-4 text-xs text-gray-400 underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-gray-400 mb-4">Tap to decide your fate.</p>
            <button 
              onClick={spinTheWheel}
              disabled={isSpinning}
              className="px-8 py-4 bg-gray-900 text-white text-lg font-bold rounded-full shadow-xl hover:bg-black transition-all transform active:scale-95"
            >
              {isSpinning ? 'Choosing...' : 'What are we eating?'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}