import React, { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import LoadingButton from "@mui/lab/LoadingButton";

import RefreshIcon from "@mui/icons-material/Refresh";

import { updateErrorMsg, selectIsLoading, updateIsLoading, replaceFeederRows } from "../../../reducer";

import "./styles.css";

const fetchFeeders = (id: string) =>
  fetch(`/api/feeders?ids=${id}`).then(async (res) => {
    const data = await res.json();
    return { ok: res.ok, data };
  });

function RefreshRowBtn({ id }: { id: string }) {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectIsLoading);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(
    async (event) => {
      event.stopPropagation();
      if (isRefreshing || isLoading) {
        dispatch(updateErrorMsg("Wait for table to load data first"));
        return;
      }

      dispatch(updateErrorMsg(""));
      dispatch(updateIsLoading(true));
      setIsRefreshing(true);
      const result = await fetchFeeders(id);
      dispatch(updateIsLoading(false));
      setIsRefreshing(false);

      if (!result.ok) {
        dispatch(updateErrorMsg(result.data.message));
        return;
      }

      dispatch(updateErrorMsg(""));
      dispatch(replaceFeederRows(result.data));
    },
    [dispatch, id, isLoading, isRefreshing]
  );

  return (
    <LoadingButton
      classes={{
        root: "loading-button",
        loading: "loading-button__loading",
      }}
      loading={isRefreshing}
      variant="text"
      onClick={onRefresh}
      sx={{ padding: 0 }}
    >
      <RefreshIcon />
    </LoadingButton>
  );
}

export default RefreshRowBtn;
