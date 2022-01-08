import { configureStore } from "@reduxjs/toolkit";

import { errorReducer, feederReducer } from "./reducer";

export const store = configureStore({
  reducer: {
    error: errorReducer,
    feeder: feederReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
