import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from './store';

export interface FeederState {
  rows: any[];
  isLoading: boolean;
}

const feederInitialState: FeederState = {
  rows: [],
  isLoading: true,
};

export const feederSlice = createSlice({
  name: "feeder",
  initialState: feederInitialState,
  reducers: {
    replace: (state, action: PayloadAction<any[]>) => {
      state.rows = action.payload;
    },
    updateIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { updateIsLoading, replace: replaceFeederRows } =
  feederSlice.actions;
export const selectFeederRows = (state: RootState) => state.feeder.rows;
export const selectIsLoading = (state: RootState) => state.feeder.isLoading;

export const feederReducer = feederSlice.reducer;

// Error
export interface ErrorState {
  errorMsg: string;
}

const errorInitialState: ErrorState = {
  errorMsg: "",
};

export const errorSlice = createSlice({
  name: "error",
  initialState: errorInitialState,
  reducers: {
    update: (state, action: PayloadAction<string>) => {
      state.errorMsg = action.payload;
    },
  },
});

export const { update: updateErrorMsg } = errorSlice.actions;
export const selectErrorMsg = (state: RootState) => state.error.errorMsg;

export const errorReducer = errorSlice.reducer;
