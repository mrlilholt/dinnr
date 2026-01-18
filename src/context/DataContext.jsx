import { createContext, useContext, useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";

const DataContext = createContext();

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }) {
  const [meals, setMeals] = useState([]);
  const [pantry, setPantry] = useState([]);
  const [weekPlan, setWeekPlan] = useState({}); // New: Stores Mon-Sun plan
  const [loading, setLoading] = useState(true);

  const HOUSEHOLD_ID = "demo_household";

  useEffect(() => {
    // 1. Subscribe to Meals
    const unsubMeals = onSnapshot(collection(db, "meals"), (snapshot) => {
      const mealsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMeals(mealsData);
    });

    // 2. Subscribe to Household Data (Plan + Pantry)
    const unsubHousehold = onSnapshot(doc(db, "households", HOUSEHOLD_ID), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPantry(data.pantry || []);
        setWeekPlan(data.week_plan || {});
      } else {
        // If household doesn't exist yet, create it automatically
        await setDoc(doc(db, "households", HOUSEHOLD_ID), {
          pantry: [],
          week_plan: {}
        });
      }
    });

    setLoading(false);

    return () => {
      unsubMeals();
      unsubHousehold();
    };
  }, []);

  const value = {
    meals,
    pantry,
    weekPlan, // Exported to the app
    loading,
    HOUSEHOLD_ID
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}