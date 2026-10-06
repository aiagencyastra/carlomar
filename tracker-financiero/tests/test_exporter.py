import io
import json
import zipfile

from tracker.exporter import csv_bytes, sheets_payload, summary_frame, zip_bundle


def test_sheets_payload_shape(report):
    payload = sheets_payload(report)
    assert payload["valueInputOption"] == "USER_ENTERED"
    ranges = [d["range"] for d in payload["data"]]
    assert ranges == ["'Resumen'!A1", "'PyG Proyectos'!A1", "'Transacciones'!A1", "'Alertas'!A1"]
    json.dumps(payload)  # serializable
    assert all(isinstance(row, list) for d in payload["data"] for row in d["values"])


def test_zip_contains_all_files(report):
    names = zipfile.ZipFile(io.BytesIO(zip_bundle(report))).namelist()
    assert {"resumen.csv", "pyg_proyectos.csv", "transacciones.csv", "alertas.csv",
            "google_sheets_batchUpdate.json"} <= set(names)


def test_csv_is_excel_friendly(report):
    data = csv_bytes(summary_frame(report))
    assert data.startswith(b"\xef\xbb\xbf") and b";" in data
