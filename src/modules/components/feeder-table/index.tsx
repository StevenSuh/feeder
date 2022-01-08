import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import classNames from "classnames";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import LoadingButton from "@mui/lab/LoadingButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import { DataGrid, GridSelectionModel } from "@mui/x-data-grid";

import PersonRemoveIcon from "@mui/icons-material/PersonRemove";

import {
  updateIsLoading,
  updateErrorMsg,
  replaceFeederRows,
  selectErrorMsg,
  selectFeederRows,
  selectIsLoading,
} from "../../../reducer";

import columns, { MAX_NUMBER_OF_FEEDERS } from "./definition";
import "./styles.css";

const fetchFeeders = () =>
  fetch("/api/feeders").then(async (res) => {
    const data = await res.json();
    return { ok: res.ok, data };
  });

const validateNewFeederName = (
  name: string,
  rows: { feederName: string }[]
): string => {
  if (!name) {
    return "Feeder name cannot be empty";
  }
  if (
    rows.find(
      ({ feederName }) => feederName.toLowerCase() === name.toLowerCase()
    )
  ) {
    return "Feeder name already exists";
  }
  if (rows.length >= MAX_NUMBER_OF_FEEDERS) {
    return "Too many feeders - remove someone before adding a new one";
  }
  return "";
};

function FeederTable() {
  const skipInitialRender = useRef(false);

  const feederRows = useSelector(selectFeederRows);
  const isLoading = useSelector(selectIsLoading);
  const errorMsg = useSelector(selectErrorMsg);
  const dispatch = useDispatch();

  const [selectedIds, setSelectedIds] = useState<GridSelectionModel>([]);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);

  const [newFeederName, setNewFeederName] = useState("");
  const [isAddNameLoading, setIsAddNameLoading] = useState(false);

  const onRefresh = useCallback(async () => {
    dispatch(updateErrorMsg(""));
    dispatch(updateIsLoading(true));
    const result = await fetchFeeders();
    dispatch(updateIsLoading(false));

    if (!result.ok) {
      dispatch(updateErrorMsg(result.data.message));
      return;
    }

    dispatch(updateErrorMsg(""));
    dispatch(replaceFeederRows(result.data));
  }, [dispatch]);

  const onClickRemoveButton = useCallback(
    (selectedIds: GridSelectionModel) => {
      dispatch(updateErrorMsg(""));
      if (!selectedIds.length) {
        dispatch(updateErrorMsg("Select a feeder to remove"));
        return;
      }
      setShowRemoveConfirmation(true);
    },
    [dispatch]
  );

  const onRemoveSelectedIds = useCallback(
    async (selectedIds: GridSelectionModel) => {
      if (isLoading) {
        dispatch(updateErrorMsg("Wait for table to load data first"));
        return;
      }

      if (!selectedIds.length) {
        dispatch(updateErrorMsg("Select a feeder to remove"));
        return;
      }

      const data = await fetch("/api/feeders", {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedIds }),
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .catch(() => false);

      if (!data) {
        dispatch(updateErrorMsg("Failed to remove - try again later"));
        return;
      }

      if (data.message) {
        dispatch(updateErrorMsg(data.message));
        return;
      }

      setSelectedIds([]);
      onRefresh();
    },
    [dispatch, isLoading, onRefresh]
  );

  const onAddFeeder = useCallback(
    async (newFeederName: string) => {
      if (isLoading) {
        dispatch(updateErrorMsg("Wait for table to load data first"));
        return;
      }

      if (isAddNameLoading) {
        return;
      }

      const validationMsg = validateNewFeederName(newFeederName, feederRows);
      if (validationMsg) {
        dispatch(updateErrorMsg(validationMsg));
        return;
      }

      setIsAddNameLoading(true);

      const data = await fetch("/api/feeder", {
        method: "POST",
        body: JSON.stringify({ name: newFeederName }),
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .catch((err) => false);

      if (!data) {
        dispatch(updateErrorMsg("Failed to add - try again later"));
        return;
      }

      if (data.message) {
        dispatch(updateErrorMsg(data.message));
        return;
      }

      setIsAddNameLoading(false);
      setNewFeederName("");
      onRefresh();
    },
    [dispatch, isAddNameLoading, isLoading, feederRows, onRefresh]
  );

  const onPressEnter = useCallback(
    (event) => {
      if (event.key === "Enter") {
        onAddFeeder(newFeederName);
      }
    },
    [onAddFeeder, newFeederName]
  );

  useEffect(() => {
    if (!skipInitialRender.current) {
      skipInitialRender.current = true;
      onRefresh();
    }
  }, [onRefresh]);

  return (
    <>
      <Stack direction="column">
        {errorMsg && (
          <Alert variant="filled" severity="error">
            {errorMsg}
          </Alert>
        )}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <h3>Last 7 days</h3>
          <Button
            classes={{ root: "action-button" }}
            className={classNames({ hide: !selectedIds.length })}
            variant="text"
            onClick={() => onClickRemoveButton(selectedIds)}
          >
            <PersonRemoveIcon />
          </Button>
        </Stack>
        <Stack className="add-feeder-wrapper" direction="column">
          <Stack direction="row" alignItems="normal" spacing={2}>
            <TextField
              id="add-feeder-input"
              classes={{ root: "add-feeder-input" }}
              label="Feeder name"
              variant="outlined"
              onChange={(event) => setNewFeederName(event.target.value)}
              onKeyDown={onPressEnter}
              value={newFeederName}
            />
            <LoadingButton
              classes={{ root: "add-feeder-btn" }}
              variant="outlined"
              onClick={() => onAddFeeder(newFeederName)}
              loading={isAddNameLoading}
              disableElevation
            >
              Add to list
            </LoadingButton>
          </Stack>
          <p className="add-feeder-note">
            Note: Riot API sucks which is why it takes forever to load
          </p>
        </Stack>
        <div style={{ height: 400, width: "100%" }}>
          <DataGrid
            classes={{ overlay: "feeder-board-overlay" }}
            rows={feederRows}
            columns={columns}
            pageSize={MAX_NUMBER_OF_FEEDERS}
            rowsPerPageOptions={[MAX_NUMBER_OF_FEEDERS]}
            loading={isLoading}
            selectionModel={selectedIds}
            onSelectionModelChange={setSelectedIds}
            checkboxSelection
            disableColumnMenu
          />
        </div>
      </Stack>
      <Dialog
        open={showRemoveConfirmation}
        onClose={() => setShowRemoveConfirmation(false)}
      >
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove{" "}
            {selectedIds.length > 1 ? "these feeders" : "this feeder"}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRemoveConfirmation(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowRemoveConfirmation(false);
              onRemoveSelectedIds(selectedIds);
            }}
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default FeederTable;
