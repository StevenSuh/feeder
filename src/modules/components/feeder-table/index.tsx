import React, { useCallback, useEffect, useState } from "react";

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

import RefreshIcon from "@mui/icons-material/Refresh";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";

import columns, { MAX_NUMBER_OF_FEEDERS } from "./definition";
import "./styles.css";

const fetchFeeders = () => fetch("/api/feeders").then((res) => res.json());

const validateNewFeederName = (
  name: string,
  rows: { feederName: string }[]
): string => {
  if (!name) {
    return "Feeder name cannot be empty";
  }
  if (rows.find(({ feederName }) => feederName === name)) {
    return "Feeder name already exists";
  }
  if (rows.length >= MAX_NUMBER_OF_FEEDERS) {
    return "Too many feeders - remove someone before adding a new one";
  }
  return "";
};

function FeederTable() {
  const [feederRows, setFeederRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState<GridSelectionModel>([]);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);

  const [newFeederName, setNewFeederName] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

  console.log(selectedIds);

  const onRefresh = useCallback(async () => {
    setErrorMsg("");
    setIsLoading(true);
    const data = await fetchFeeders();
    setFeederRows(data);
    setIsLoading(false);
  }, []);

  const onClickRemoveButton = useCallback((selectedIds: GridSelectionModel) => {
    setErrorMsg("");
    if (!selectedIds.length) {
      setErrorMsg("Select a feeder to remove");
      return;
    }
    setShowRemoveConfirmation(true);
  }, []);

  const onRemoveSelectedIds = useCallback(
    async (selectedIds: GridSelectionModel) => {
      if (!selectedIds.length) {
        setErrorMsg("Select a feeder to remove");
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
        setErrorMsg("Failed to remove - try again later");
        return;
      }

      if (data.message) {
        setErrorMsg(data.message);
        return;
      }

      setSelectedIds([]);
      onRefresh();
    },
    [onRefresh]
  );

  const onAddFeeder = useCallback(
    async (newFeederName: string) => {
      const validationMsg = validateNewFeederName(newFeederName, feederRows);
      if (validationMsg) {
        setErrorMsg(validationMsg);
        return;
      }

      const data = await fetch("/api/feeder", {
        method: "POST",
        body: JSON.stringify({ name: newFeederName }),
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .catch(() => false);

      if (!data) {
        setErrorMsg("Failed to add - try again later");
        return;
      }

      if (data.message) {
        setErrorMsg(data.message);
        return;
      }

      setNewFeederName("");
      onRefresh();
    },
    [feederRows, onRefresh]
  );

  useEffect(() => void onRefresh(), [onRefresh]);

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
          <h4>Last 7 days</h4>
          <Stack direction="row" alignItems="center">
            <Button
              classes={{ root: "action-button" }}
              variant="text"
              onClick={() => onClickRemoveButton(selectedIds)}
            >
              <PersonRemoveIcon />
            </Button>
            <LoadingButton
              classes={{
                root: "loading-button",
                loading: "loading-button__loading",
              }}
              loading={isLoading}
              variant="text"
              onClick={onRefresh}
            >
              <RefreshIcon />
            </LoadingButton>
          </Stack>
        </Stack>
        <Stack className="add-feeder-wrapper" direction="column">
          <Stack direction="row" alignItems="normal" spacing={2}>
            <TextField
              id="add-feeder-input"
              classes={{ root: "add-feeder-input" }}
              label="Feeder name"
              variant="outlined"
              onChange={(event) => setNewFeederName(event.target.value)}
              value={newFeederName}
            />
            <Button
              classes={{ root: "add-feeder-btn" }}
              variant="outlined"
              onClick={() => onAddFeeder(newFeederName)}
              disableElevation
            >
              Add to list
            </Button>
          </Stack>
          <p className="add-feeder-note">
            Note: newly added feeders will need some time before the table
            starts showing accurate data
          </p>
        </Stack>
        <div style={{ height: 400, width: "100%" }}>
          <DataGrid
            rows={feederRows}
            columns={columns}
            pageSize={20}
            rowsPerPageOptions={[20]}
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
            Are you sure you want to remove these feeders?
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
