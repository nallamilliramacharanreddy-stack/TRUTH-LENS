/**
 * TruthLens AI - Dataset Batch Evaluator Controller
 * Handles drag-and-drop file upload, API processing, summary metrics,
 * live filtering, and CSV export.
 */

let selectedFile = null;
let currentDatasetResult = null;
let activeFilter = "ALL";

$(document).ready(function () {
    initDropzone();
    initUploadActions();
    initDatasetFilters();
});

function initDropzone() {
    const $dropzone = $("#dropzoneBox");

    $dropzone.on("dragover dragenter", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $dropzone.addClass("dragover");
    });

    $dropzone.on("dragleave dragend drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $dropzone.removeClass("dragover");
    });

    $dropzone.on("drop", function (e) {
        const files = e.originalEvent.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    $("#datasetFileInput, #galleryUploadInput, #fileUploadInput").on("change", function () {
        if (this.files && this.files.length > 0) {
            handleFileSelection(this.files[0]);
        }
    });
}

function handleFileSelection(file) {
    selectedFile = file;
    const name = file.name;
    const sizeKb = Math.round(file.size / 1024);
    
    // Check if image from phone gallery / camera
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif)$/i.test(name);
    if (isImage) {
        const reader = new FileReader();
        reader.onload = function (e) {
            $("#imagePreviewThumb").attr("src", e.target.result);
            $("#imagePreviewContainer").removeClass("d-none");
            $("#dropzoneIconContainer").addClass("d-none");
        };
        reader.readAsDataURL(file);
        $("#fileSelectedName").html(`<span class="text-warning fw-bold"><i class="fa fa-camera me-1"></i> ${name}</span> (${sizeKb} KB ready)`);
        $("#dropzoneHelpText").html(`<span class="text-success"><i class="fa fa-check-circle me-1"></i>Image loaded from gallery/camera. Ready to check if FAKE or REAL.</span>`);
    } else {
        $("#imagePreviewContainer").addClass("d-none");
        $("#dropzoneIconContainer").removeClass("d-none");
        $("#fileSelectedName").html(`<span class="text-primary fw-bold"><i class="fa fa-file-alt me-1"></i> ${name}</span> (${sizeKb} KB ready)`);
        $("#dropzoneHelpText").html(`<span class="text-info"><i class="fa fa-check-circle me-1"></i>File loaded. Ready for AI batch verification.</span>`);
    }

    $("#startBatchBtn").prop("disabled", false).addClass("btn-warning text-dark").removeClass("btn-primary");
}

function initUploadActions() {
    $("#startBatchBtn").on("click", function () {
        if (!selectedFile) {
            alert("Please choose or drop a CSV/JSON dataset file first.");
            return;
        }

        const maxRows = $("#maxRowsSelect").val() || 100;
        const formData = new FormData();
        formData.append("file", selectedFile);

        $("#batchResultsArea").addClass("d-none");
        $("#batchLoadingArea").removeClass("d-none");
        $("#startBatchBtn").prop("disabled", true);

        $('html, body').animate({
            scrollTop: $("#batchLoadingArea").offset().top - 80
        }, 500);

        $.ajax({
            url: `/api/dataset/upload?max_rows=${maxRows}`,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function (data) {
                $("#batchLoadingArea").addClass("d-none");
                $("#startBatchBtn").prop("disabled", false);
                currentDatasetResult = data;
                renderBatchDashboard(data);
            },
            error: function (xhr) {
                $("#batchLoadingArea").addClass("d-none");
                $("#startBatchBtn").prop("disabled", false);
                const err = xhr.responseJSON ? xhr.responseJSON.detail : "Upload failed. Please check the file format.";
                alert("Dataset Processing Error: " + err);
            }
        });
    });

    $("#btnRunIsotBenchmark").on("click", function () {
        $("#batchResultsArea").addClass("d-none");
        $("#batchLoadingArea").removeClass("d-none");
        $("#batchProgressMsg").text("Evaluating 100 authentic articles from Kaggle ISOT Fake & Real News Dataset...");

        $('html, body').animate({
            scrollTop: $("#batchLoadingArea").offset().top - 80
        }, 500);

        $.ajax({
            url: "/api/dataset/benchmark/run?max_rows=100",
            type: "POST",
            success: function (data) {
                $("#batchLoadingArea").addClass("d-none");
                currentDatasetResult = data;
                renderBatchDashboard(data);
            },
            error: function (xhr) {
                $("#batchLoadingArea").addClass("d-none");
                const err = xhr.responseJSON ? xhr.responseJSON.detail : "Failed to run benchmark.";
                alert("Benchmark Error: " + err);
            }
        });
    });

    $("#btnExportClassifiedCsv").on("click", function () {
        if (!currentDatasetResult || !currentDatasetResult.rows) return;
        
        fetch("/api/dataset/export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: currentDatasetResult.rows })
        })
        .then(res => res.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `truthlens_classified_${currentDatasetResult.filename || 'dataset'}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        })
        .catch(() => alert("Export failed."));
    });
}

function renderBatchDashboard(data) {
    // Intelligence Notice Banner
    if (data.dataset_notice) {
        $("#datasetNoticeBanner").removeClass("d-none");
        $("#datasetNoticeText").text(data.dataset_notice);
    } else {
        $("#datasetNoticeBanner").addClass("d-none");
    }

    const sum = data.summary || {};
    $("#statTotalRows").text(data.total_records);
    $("#statDetectedCol").text(`Column: "${data.text_column_detected}"`);

    $("#statFakePct").text(`${sum.fake_percentage}%`);
    $("#statFakeCount").text(sum.fake_count);

    $("#statRealPct").text(`${sum.real_percentage}%`);
    $("#statRealCount").text(sum.real_count);

    $("#statAvgConf").text(`${sum.average_confidence}%`);

    // Pill badge counts
    $("#pillCountAll").text(data.total_records);
    $("#pillCountFake").text(sum.fake_count);
    $("#pillCountReal").text(sum.real_count);
    $("#pillCountMis").text(sum.misleading_count);

    // Ground truth banner
    if (sum.ground_truth_accuracy !== null && sum.ground_truth_evaluated > 0) {
        $("#groundTruthBanner").removeClass("d-none");
        $("#statAccuracyPct").text(`${sum.ground_truth_accuracy}%`);
        $("#statMatchesCount").text(sum.ground_truth_matches);
        $("#statEvalCount").text(sum.ground_truth_evaluated);
    } else {
        $("#groundTruthBanner").addClass("d-none");
    }

    $("#batchResultsArea").removeClass("d-none");
    $('html, body').animate({
        scrollTop: $("#batchResultsArea").offset().top - 80
    }, 600);

    applyTableFilters();
}

function initDatasetFilters() {
    $(".filter-pill").on("click", function () {
        $(".filter-pill").removeClass("active");
        $(this).addClass("active");
        activeFilter = $(this).data("filter");
        applyTableFilters();
    });

    $("#datasetSearchInput").on("keyup", function () {
        applyTableFilters();
    });
}

function applyTableFilters() {
    if (!currentDatasetResult || !currentDatasetResult.rows) return;

    const query = ($("#datasetSearchInput").val() || "").toLowerCase().trim();
    const rows = currentDatasetResult.rows.filter(r => {
        const matchesQuery = !query || r.full_text.toLowerCase().includes(query) || String(r.id) === query;
        const matchesFilter = (activeFilter === "ALL") || (r.classification === activeFilter);
        return matchesQuery && matchesFilter;
    });

    let html = "";
    if (rows.length === 0) {
        html = '<tr><td colspan="6" class="text-center text-muted py-4">No records match the selected filter.</td></tr>';
    } else {
        rows.forEach(r => {
            let badgeClass = "badge-unverified";
            if (r.classification === "REAL") badgeClass = "badge-real";
            else if (r.classification === "FAKE") badgeClass = "badge-fake";
            else if (r.classification === "MISLEADING") badgeClass = "badge-misleading";

            let gtHtml = '<span class="text-muted">Unlabeled</span>';
            if (r.ground_truth) {
                const matchIcon = r.is_match 
                    ? '<i class="fa fa-check-circle text-success ms-1" title="Prediction matches ground truth"></i>'
                    : '<i class="fa fa-times-circle text-danger ms-1" title="Prediction mismatch"></i>';
                gtHtml = `<span class="badge bg-dark border border-secondary text-light">${r.ground_truth}</span> ${matchIcon}`;
            }

            html += `
                <tr>
                    <td><small class="text-muted">#${r.id}</small></td>
                    <td>
                        <div class="text-light" style="max-height: 4.2em; overflow: hidden; line-height: 1.4;">${r.text}</div>
                    </td>
                    <td>
                        <span class="badge ${badgeClass} px-2 py-1">${r.classification}</span>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <span class="fw-bold text-primary small">${r.confidence_score}%</span>
                            <div class="progress" style="width: 60px; height: 6px; background: #251c18;">
                                <div class="progress-bar bg-warning" style="width: ${r.confidence_score}%;"></div>
                            </div>
                        </div>
                    </td>
                    <td>${gtHtml}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="inspectRow(${r.id})">
                            <i class="fa fa-eye me-1"></i> Details
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    $("#datasetTableBody").html(html);
}

function inspectRow(rowId) {
    if (!currentDatasetResult) return;
    const item = currentDatasetResult.rows.find(r => r.id === rowId);
    if (!item) return;

    $("#modalFullText").text(item.full_text);

    let badgeClass = "badge-unverified";
    if (item.classification === "REAL") badgeClass = "badge-real";
    else if (item.classification === "FAKE") badgeClass = "badge-fake";
    else if (item.classification === "MISLEADING") badgeClass = "badge-misleading";

    $("#modalVerdictBadge").attr("class", `badge-classification ${badgeClass}`).text(item.classification);
    $("#modalConfidenceScore").text(item.confidence_score + "%");

    if (item.ground_truth) {
        $("#modalGroundTruthStatus").html(`
            Labeled: <span class="badge bg-dark border text-light">${item.ground_truth}</span> 
            ${item.is_match ? '<span class="text-success ms-1">✓ Match</span>' : '<span class="text-danger ms-1">✗ Mismatch</span>'}
        `);
    } else {
        $("#modalGroundTruthStatus").html('<span class="text-muted">No ground truth column provided</span>');
    }

    $("#modalEvidenceRel").text(`${item.evidence_relationship} (${item.evidence_strength} strength)`);

    $("#modalDeepAnalyzeBtn").off("click").on("click", function () {
        window.location.href = `detect.html?q=${encodeURIComponent(item.full_text)}&type=article`;
    });

    const modal = new bootstrap.Modal(document.getElementById('rowDetailsModal'));
    modal.show();
}
