import { useState } from 'react';
import { useData } from '../context/DataContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Generator() {
  // Pull lockedDays from useData context so it persists across navigation
  const { meals, weekPlan, lockedDays, HOUSEHOLD_ID } = useData();
  const [selectedDays, setSelectedDays] = useState([]);
  const [shufflingDays, setShufflingDays] = useState([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [filterTag, setFilterTag] = useState(null);
  
  const navigate = useNavigate();

  // --- UPDATED: PERSISTENT LOCK TOGGLE ---
  const toggleLock = async (e, day) => {
    e.stopPropagation();
    
    const isCurrentlyLocked = lockedDays.includes(day);
    const newLockedDays = isCurrentlyLocked
      ? lockedDays.filter((d) => d !== day)
      : [...lockedDays, day];

    try {
      const householdRef = doc(db, "households", HOUSEHOLD_ID);
      await updateDoc(householdRef, {
        locked_days: newLockedDays
      });
    } catch (error) {
      console.error("Error saving lock status:", error);
    }
  };

  const generateForSelected = async () => {
    const targetDays = selectedDays.filter(day => !lockedDays.includes(day));

    if (targetDays.length === 0) {
      alert("Please select at least one unlocked day to fill.");
      return;
    }

    setShufflingDays(targetDays);

    try {
      const householdRef = doc(db, "households", HOUSEHOLD_ID);

      const lockedMealNames = DAYS
        .filter(d => lockedDays.includes(d))
        .map(d => weekPlan[d])
        .filter(Boolean);

      let pool = meals.filter(m => !lockedMealNames.includes(m.name));

      if (filterTag) {
        pool = pool.filter(m => m.tags?.includes(filterTag));
      }

      if (pool.length < targetDays.length) {
        setShowErrorModal(true);
        setShufflingDays([]);
        return;
      }

      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      await new Promise(resolve => setTimeout(resolve, 800));

      for (let i = 0; i < targetDays.length; i++) {
        const day = targetDays[i];
        const newMeal = shuffled[i];
        await updateDoc(householdRef, {
          [`week_plan.${day}`]: newMeal.name
        });
      }
    } catch (error) {
      console.error("Magic Fill Error:", error);
    } finally {
      setShufflingDays([]);
    }
  };

  return (
    <div className="pb-24 max-w-md mx-auto p-4">
      <div className="mb-8">
        <div className="relative flex justify-center items-center mb-6 min-h-[40px]">
          <h3 className="absolute left-0 text-lg font-bold text-gray-700">This Week's Plan</h3>
        </div>

        <div className="space-y-3">
          {DAYS.map(day => {
            const hasMeal = !!weekPlan[day];
            const isSelected = selectedDays.includes(day);
            const isLocked = lockedDays.includes(day);

            const handleDayClick = async () => {
              if (isLocked) {
                setSelectedDays(isSelected ? selectedDays.filter(d => d !== day) : [...selectedDays, day]);
                return;
              }

              // --- UPDATED: CLEAR MEAL + REMOVE LOCK ---
              if (hasMeal) {
                try {
                  const householdRef = doc(db, "households", HOUSEHOLD_ID);
                  // Remove the lock if the day is being cleared
                  const newLockedDays = lockedDays.filter((d) => d !== day);
                  
                  await updateDoc(householdRef, { 
                    [`week_plan.${day}`]: null,
                    locked_days: newLockedDays 
                  });
                  
                  setSelectedDays(selectedDays.filter(d => d !== day));
                } catch (error) {
                  console.error("Error clearing day:", error);
                }
                return;
              }

              if (isSelected) {
                setSelectedDays(selectedDays.filter(d => d !== day));
              } else {
                // Capacity check logic
                const lockedMealCount = lockedDays.length;
                const availableMealCount = meals.length - lockedMealCount;

                if (selectedDays.length >= availableMealCount) {
                  setShowErrorModal(true);
                  return;
                }
                setSelectedDays([...selectedDays, day]);
              }
            };

            return (
              <div 
                key={day} 
                onClick={handleDayClick}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer
                  ${isSelected || hasMeal 
                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' 
                    : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-colors
                    ${isSelected || hasMeal ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                    {day.slice(0, 3).toUpperCase()}
                  </div>

                  <div>
                    {shufflingDays.includes(day) ? (
                      <span className="font-bold text-blue-400 animate-pulse">
                        {meals[Math.floor(Math.random() * meals.length)]?.name || "Picking..."}
                      </span>
                    ) : hasMeal ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-blue-900">{weekPlan[day]}</span>
                        {!isLocked && <span className="text-[10px] text-blue-400 italic">Click to clear</span>}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-sm">
                        {isSelected ? 'Ready to fill...' : 'Click to select'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasMeal && (
                    <button 
                      onClick={(e) => toggleLock(e, day)} 
                      className="p-1 group transition-transform active:scale-90"
                    >
                      {isLocked ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-600">
                          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-300 group-hover:text-blue-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <br />
        
        <div className="flex justify-center items-center">
          {/* 1. Only show the container if the user has selected at least one day */}
          {selectedDays.length > 0 && (
            <>
              {/* 2. IF there are unlocked selected days, show 'Mix it Up' */}
              {selectedDays.filter(d => !lockedDays.includes(d)).length > 0 ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    generateForSelected();
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                >
                  Let's Mix it Up! ({selectedDays.filter(d => !lockedDays.includes(d)).length} days)
                </button>
              ) : (
                /* 3. ELSE (All selected days are locked), show 'Go to Pantry' */
                <button 
                  onClick={() => navigate('/pantry')}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2 animate-in fade-in zoom-in duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  Go to Pantry
                </button>
              )}
            </>
          )}
        </div>     
      </div>

      {/* --- CAPACITY ERROR MODAL --- */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-amber-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Need More Meals</h3>
              <p className="text-sm text-gray-500 mb-6">
                You currently have <strong>{meals.length} total meals</strong>. To plan for more days, please add more unique meals to your library first!
              </p>
              <button 
                onClick={() => setShowErrorModal(false)}
                className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}