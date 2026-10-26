/**
 * TruthLens AI - Frontend Misinformation Detection Controller
 * Handles input parsing, API dispatching, animated spinner states,
 * results rendering, distinction highlighting, statistics counter, history, and feedback.
 */

// Navigation URLs config
const NAV_KEYS = {
    home_url: "index.html",
    detect_url: "detect.html",
    how_it_works_url: "how-it-works.html",
    about_url: "about.html",
    history_url: "history.html",
    contact_url: "contact.html",
    login_url: "#loginModal",
    dashboard_url: "history.html"
};

const PROCESSING_STEPS = [
    { state: "RECEIVED", label: "Input Received & Validated" },
    { state: "EXTRACTING", label: "Extracting Article Content & Metadata..." },
    { state: "PREPROCESSING", label: "Text Normalization & Tokenization..." },
    { state: "CLAIM_EXTRACTION", label: "Extracting Factual Claims..." },
    { state: "SOURCE_CHECK", label: "Checking Domain & Publisher Reputation..." },
    { state: "FACT_CHECK", label: "Searching Verified Repositories..." },
    { state: "ML_ANALYSIS", label: "Evaluating BERT & NLP Linguistic Weights..." },
    { state: "EVIDENCE_ANALYSIS", label: "Corroborating Multi-Source Evidence..." },
    { state: "FINALIZING", label: "Generating Explainable Result & Confidence..." },
    { state: "COMPLETED", label: "Analysis Completed!" }
];

let currentActiveType = "article";
let currentAnalysisId = null;

$(document).ready(function () {
    initInputTypeSwitching();
    initHeroDirectInput();
    initSampleChips();
    loadLiveStatistics();
    loadHistoryTable();

    // Check if on detect page with prefilled query or ID
    const urlParams = new URLSearchParams(window.location.search);
    const prefillId = urlParams.get('id');
    const prefillContent = urlParams.get('q');
    const prefillType = urlParams.get('type');
    const prefillUrl = urlParams.get('url');

    if (prefillId) {
        viewHistoryItem(prefillId);
    } else if (prefillType === "file") {
        selectType("file");
    } else if (prefillContent) {
        $("#newsInputContent").val(prefillContent);
        if (prefillType) selectType(prefillType);
        triggerAnalysis();
    } else if (prefillUrl) {
        selectType("url");
        $("#newsInputUrl").val(prefillUrl);
        triggerAnalysis();
    }

    initComparisonMode();
    initHistorySearchAndFilters();
    initWorkbenchFileUpload();
});

function initInputTypeSwitching() {
    $(".input-type-btn").on("click", function () {
        const type = $(this).data("type");
        selectType(type);
    });
}

function selectType(type) {
    currentActiveType = type;
    $(".input-type-btn").removeClass("active");
    $(`.input-type-btn[data-type="${type}"]`).addClass("active");

    if (type === "url") {
        $("#textInputContainer").addClass("d-none");
        $("#fileUploadWorkbenchContainer").addClass("d-none");
        $("#urlInputContainer").removeClass("d-none");
    } else if (type === "file") {
        $("#textInputContainer").addClass("d-none");
        $("#urlInputContainer").addClass("d-none");
        $("#fileUploadWorkbenchContainer").removeClass("d-none");
    } else {
        $("#urlInputContainer").addClass("d-none");
        $("#fileUploadWorkbenchContainer").addClass("d-none");
        $("#textInputContainer").removeClass("d-none");
        const placeholders = {
            article: "Paste full news article text here for deep linguistic and factual verification...",
            headline: "Enter news headline to verify (e.g. 'Secret weather machine steers hurricanes')...",
            claim: "Enter specific factual claim (e.g. 'Scientists discovered medicine curing every type of cancer')...",
            text: "Paste general unverified text or social media rumor here..."
        };
        $("#newsInputContent").attr("placeholder", placeholders[type] || placeholders.article);
    }
}

let selectedWorkbenchFile = null;

function initWorkbenchFileUpload() {
    $("#workbenchFileInput, #workbenchGalleryInput, #workbenchDocInput").on("change", function () {
        if (this.files && this.files.length > 0) {
            handleWorkbenchFile(this.files[0]);
        }
    });
}

function handleWorkbenchFile(file) {
    selectedWorkbenchFile = file;
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name);
    $("#wbBadgeFilename").text(file.name + ` (${Math.round(file.size / 1024)} KB)`);

    if (isImage) {
        const reader = new FileReader();
        reader.onload = function (e) {
            $("#wbThumbImg").attr("src", e.target.result).removeClass("d-none");
        };
        reader.readAsDataURL(file);
    } else {
        $("#wbThumbImg").addClass("d-none");
    }

    $("#wbUploadPrompt").addClass("d-none");
    $("#wbFilePreviewCard").removeClass("d-none");
    $("#wbExtractedTextReview").val("Scanning and extracting text from " + file.name + " via AI OCR...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", $("#languageSelect").val() || "English");

    $.ajax({
        url: "/api/upload/file",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (res) {
            $("#wbExtractedTextReview").val(res.extracted_text);
            $("#newsInputContent").val(res.extracted_text);
            const verdict = res.analysis.result.classification;
            $("#mainAnalyzeBtn").html(`<i class="fa fa-shield-alt me-2"></i> VERIFY EXTRACTED CONTENT (${verdict})`);
            // Render results immediately!
            renderAnalysisResults(res.analysis);
            loadLiveStatistics();
            loadHistoryTable();
        },
        error: function (xhr) {
            const err = xhr.responseJSON ? xhr.responseJSON.detail : "Extraction failed.";
            $("#wbExtractedTextReview").val("Notice: " + err + "\n\nYou can refine or type the text directly here.");
        }
    });
}

function initHeroDirectInput() {
    $("#heroCheckBtn").on("click", function (e) {
        e.preventDefault();
        const raw = $("#heroInputText").val().trim();
        if (!raw) {
            alert("Please paste a news article, headline, claim, or URL first.");
            return;
        }

        // Determine if it looks like a URL
        if (raw.startsWith("http://") || raw.startsWith("https://") || (raw.includes(".") && !raw.includes(" ") && raw.length < 120)) {
            selectType("url");
            $("#newsInputUrl").val(raw);
        } else {
            selectType(currentActiveType === "url" ? "article" : currentActiveType);
            $("#newsInputContent").val(raw);
        }

        // Scroll to detect area if present on index, or trigger analysis
        if ($("#detectArea").length > 0) {
            $('html, body').animate({
                scrollTop: $("#detectArea").offset().top - 80
            }, 800);
            triggerAnalysis();
        } else {
            // Redirect to detect.html with query
            window.location.href = `detect.html?q=${encodeURIComponent(raw)}&type=${currentActiveType}`;
        }
    });

    $("#mainAnalyzeBtn").on("click", function (e) {
        e.preventDefault();
        triggerAnalysis();
    });

    $("#verifyUrlBtn").on("click", function (e) {
        e.preventDefault();
        triggerAnalysis();
    });
}

function initSampleChips() {
    $(".sample-chip").on("click", function () {
        const text = $(this).data("text");
        const type = $(this).data("type") || "claim";
        const url = $(this).data("url") || "";

        selectType(type);
        if (type === "url") {
            $("#newsInputUrl").val(url || text);
        } else {
            $("#newsInputContent").val(text);
        }

        if ($("#detectArea").length > 0) {
            $('html, body').animate({
                scrollTop: $("#detectArea").offset().top - 80
            }, 800);
            triggerAnalysis();
        }
    });
}

function loadSampleById(sampleId) {
    $.getJSON("/api/samples", function (samples) {
        const found = samples.find(s => s.id === sampleId);
        if (found) {
            selectType(found.type);
            if (found.type === "url") {
                $("#newsInputUrl").val(found.url);
            } else {
                $("#newsInputContent").val(found.content);
            }
            $('html, body').animate({
                scrollTop: $("#detectArea").offset().top - 80
            }, 800);
            triggerAnalysis();
        }
    });
}

function triggerAnalysis() {
    let payload = {
        input_type: currentActiveType,
        language: $("#languageSelect").val() || "English",
        user_id: "USER001"
    };

    if (currentActiveType === "url") {
        const urlVal = $("#newsInputUrl").val().trim();
        if (!urlVal) {
            alert("Please provide a valid news URL.");
            return;
        }
        payload.url = urlVal;
        payload.content = "";
    } else if (currentActiveType === "file") {
        const fileText = $("#wbExtractedTextReview").val().trim() || $("#newsInputContent").val().trim();
        if (!fileText || fileText.startsWith("Notice:") || fileText.startsWith("Scanning")) {
            alert("Please upload a photo from phone gallery or choose a document first.");
            return;
        }
        payload.content = fileText;
        payload.url = "";
        payload.input_type = "article";
    } else {
        const contentVal = $("#newsInputContent").val().trim();
        if (!contentVal) {
            alert("Please paste text, headline or claim to analyze.");
            return;
        }
        payload.content = contentVal;
        payload.url = "";
    }

    startLoadingAnimation();

    $.ajax({
        url: "/api/analyze",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(payload),
        success: function (data) {
            finishLoadingAnimation(function () {
                renderAnalysisResults(data);
                loadLiveStatistics();
                loadHistoryTable();
            });
        },
        error: function (xhr) {
            stopLoadingAnimation();
            const err = xhr.responseJSON ? xhr.responseJSON.detail : "Analysis failed. Please check network connection.";
            alert("Error: " + err);
        }
    });
}

function startLoadingAnimation() {
    $("#analysisResultsArea").addClass("d-none");
    $("#analysisLoadingArea").removeClass("d-none");

    $('html, body').animate({
        scrollTop: $("#analysisLoadingArea").offset().top - 100
    }, 500);

    let stepIndex = 0;
    const progressInterval = setInterval(function () {
        if (stepIndex < PROCESSING_STEPS.length - 1) {
            const step = PROCESSING_STEPS[stepIndex];
            $("#processingStateTitle").text(step.state);
            $("#processingStatusMessage").text(step.label);

            const pct = Math.round(((stepIndex + 1) / PROCESSING_STEPS.length) * 100);
            $("#processingProgressBar").css("width", pct + "%");

            stepIndex++;
        }
    }, 280);

    window.activeAnalysisTimer = progressInterval;
}

function finishLoadingAnimation(callback) {
    if (window.activeAnalysisTimer) {
        clearInterval(window.activeAnalysisTimer);
    }
    $("#processingStateTitle").text("COMPLETED");
    $("#processingStatusMessage").text("Analysis Completed & Grounded!");
    $("#processingProgressBar").css("width", "100%");

    setTimeout(function () {
        $("#analysisLoadingArea").addClass("d-none");
        if (callback) callback();
    }, 400);
}

function stopLoadingAnimation() {
    if (window.activeAnalysisTimer) clearInterval(window.activeAnalysisTimer);
    $("#analysisLoadingArea").addClass("d-none");
}

function renderAnalysisResults(data) {
    currentAnalysisId = data.analysis_id;
    $("#analysisResultsArea").removeClass("d-none");

    $('html, body').animate({
        scrollTop: $("#analysisResultsArea").offset().top - 80
    }, 600);

    // 1. Result Classification Badge & Confidence
    const res = data.result || {};
    const classification = (res.classification || "UNVERIFIED").toUpperCase();
    const confScore = res.confidence_score || 0;
    const strength = res.evidence_strength || "MEDIUM";

    let badgeClass = "badge-unverified";
    let iconHtml = '<i class="fa fa-question-circle"></i>';
    if (classification === "REAL") {
        badgeClass = "badge-real";
        iconHtml = '<i class="fa fa-check-circle"></i>';
    } else if (classification === "FAKE") {
        badgeClass = "badge-fake";
        iconHtml = '<i class="fa fa-times-circle"></i>';
    } else if (classification === "MISLEADING") {
        badgeClass = "badge-misleading";
        iconHtml = '<i class="fa fa-exclamation-triangle"></i>';
    }

    $("#resClassificationBadge")
        .attr("class", `badge-classification ${badgeClass}`)
        .html(`${iconHtml} ${classification}`);

    $("#resConfidenceScore").text(confScore + "%");
    $("#resConfidenceProgressBar").css("width", confScore + "%");
    $("#resEvidenceStrengthBadge")
        .attr("class", `strength-badge strength-${strength.toLowerCase()}`)
        .text(strength);

    // 2. Section 15: Important Distinction (Model Prediction vs Factual Verification)
    const pred = data.prediction || {};
    const realPct = Math.round((pred.real_probability || 0) * 100);
    const fakePct = Math.round((pred.fake_probability || 0) * 100);
    const misPct = Math.round((pred.misleading_probability || 0) * 100);
    const unvPct = Math.round((pred.unverified_probability || 0) * 100);

    $("#distinctionPrediction").html(`<b>AI Prediction:</b> ${classification} — ${confScore}% (Real: ${realPct}%, Fake: ${fakePct}%, Misleading: ${misPct}%, Unverified: ${unvPct}%)`);
    $("#distinctionEvidence").html(`<b>Evidence Grounding:</b> ${strength}-strength external corroboration available.`);

    let verifNote = "Evidence directly corroborates the core reported assertions.";
    if (classification === "FAKE") {
        verifNote = "Established scientific/institutional documentation directly refutes submitted assertions.";
    } else if (classification === "MISLEADING") {
        verifNote = "Some claims find contextual reporting while others make unsubstantiated extrapolations.";
    } else if (classification === "UNVERIFIED") {
        verifNote = "Public records provide insufficient evidence to decisively verify or debunk.";
    }
    $("#distinctionVerification").html(`<b>Factual Verification:</b> ${verifNote}`);

    // 3. Section 10: Source Analysis Card
    const src = data.source || {};
    $("#srcPublisher").text(src.publisher || src.name || "Direct Submission");
    $("#srcDomain").text(src.domain || "N/A");
    $("#srcAuthor").text(src.author || "Editorial Staff");
    $("#srcPublished").text(src.publication_date || "Today");
    $("#srcStatusBadge").text(src.source_status || "INFORMATIONAL");
    $("#srcInfoNote").text(src.source_information || "Informational evaluation.");

    // 4. Section 11: Content NLP Analysis
    const nlp = data.nlp || {};
    $("#nlpSentiment").text(`${nlp.sentiment_label || 'Neutral'} (${nlp.sentiment_score || 0})`);
    $("#nlpSubjectivity").text(`${Math.round((nlp.subjectivity_score || 0) * 100)}%`);
    $("#nlpClickbait").text(`${nlp.clickbait_signal || 'Low'} (${nlp.clickbait_score || 0})`);
    $("#nlpSensationalism").text(`${nlp.sensationalism_signal || 'Low'} (${nlp.sensationalism_score || 0})`);
    $("#nlpLanguageQuality").text(`${Math.round((nlp.language_score || 0) * 100)}%`);
    $("#nlpSemanticMatch").text(`${Math.round((nlp.semantic_score || 0) * 100)}%`);

    // 4b. Linguistic Token Inspector
    if (data.annotations && $("#annotatedTextDisplay").length > 0) {
        $("#annotatedTextDisplay").html(data.annotations.annotated_html || "<em>No markup generated</em>");
        const counts = data.annotations.counts || {};
        $("#countSensational").text(counts.sensational || 0);
        $("#countClickbait").text(counts.clickbait || 0);
        $("#countSubjective").text(counts.subjective || 0);
        $("#countFactual").text(counts.factual || 0);
        $("#tokenInspectorArea").removeClass("d-none");
    }

    // 5. Section 17: Explanation Section ("WHY THIS RESULT?")
    const exp = data.explanation || {};
    const expList = exp.explanation || [];
    let expHtml = "";
    if (expList.length === 0) {
        expHtml = "<li>Assessment synthesized based on multi-source knowledge base retrieval.</li>";
    } else {
        expList.forEach(item => {
            expHtml += `<li class="mb-2"><i class="fa fa-info-circle text-primary me-2"></i>${item}</li>`;
        });
    }
    $("#explanationList").html(expHtml);

    // 6. Section 18: Claims Section
    const claims = data.claims || [];
    let claimsHtml = "";
    if (claims.length === 0) {
        claimsHtml = '<div class="text-muted p-3">No discrete factual assertions detected.</div>';
    } else {
        claims.forEach((clm, idx) => {
            let clmBadge = "badge bg-secondary";
            if (clm.status === "SUPPORTED") clmBadge = "badge bg-success";
            else if (clm.status === "CONTRADICTED") clmBadge = "badge bg-danger";
            else if (clm.status === "PARTIALLY_SUPPORTED") clmBadge = "badge bg-warning text-dark";

            claimsHtml += `
                <div class="claim-card">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="text-primary fw-bold">CLAIM #${String(idx + 1).padStart(2, '0')}</span>
                        <span class="${clmBadge}">${clm.status}</span>
                    </div>
                    <p class="fs-6 mb-2 text-light">"${clm.claim_text}"</p>
                    <div class="d-flex justify-content-between align-items-center text-muted small">
                        <span><strong>Subject:</strong> ${clm.subject || 'N/A'} &nbsp;|&nbsp; <strong>Predicate:</strong> ${clm.predicate || 'asserts'}</span>
                        <button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="scrollToEvidence()">View Evidence</button>
                    </div>
                </div>
            `;
        });
    }
    $("#claimsContainer").html(claimsHtml);
    $("#claimsCountBadge").text(`${claims.length} Extracted`);

    // 7. Section 19: Evidence Section
    const evidence = data.evidence || [];
    let evdHtml = "";
    if (evidence.length === 0) {
        evdHtml = `
            <div class="evidence-card text-muted">
                <i class="fa fa-search me-2"></i>No direct contradictory or supporting primary records found in current verified knowledge base.
            </div>
        `;
    } else {
        evidence.forEach((e, idx) => {
            let relClass = "rel-unrelated";
            let relIcon = "fa-minus-circle";
            const rel = (e.relationship || "").toUpperCase();
            if (rel === "SUPPORTS") { relClass = "rel-supports"; relIcon = "fa-check-circle"; }
            else if (rel === "CONTRADICTS") { relClass = "rel-contradicts"; relIcon = "fa-times-circle"; }
            else if (rel === "PARTIALLY_SUPPORTS") { relClass = "rel-partially-supports"; relIcon = "fa-exclamation-circle"; }

            evdHtml += `
                <div class="evidence-card">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <span class="text-primary fw-bold me-2">EVIDENCE #${String(idx + 1).padStart(2, '0')}</span>
                            <span class="text-light fw-bold">${e.source_name}</span>
                        </div>
                        <span class="rel-badge ${relClass}"><i class="fa ${relIcon} me-1"></i>${rel}</span>
                    </div>
                    <p class="small text-light mb-2">"${e.evidence_text}"</p>
                    <div class="d-flex justify-content-between align-items-center small text-muted">
                        <span>Date: ${e.source_date || 'Recent'}</span>
                        ${e.source_url ? `<a href="${e.source_url}" target="_blank" class="btn btn-sm btn-outline-light py-0 px-2"><i class="fa fa-external-link-alt me-1"></i>Open Source</a>` : ''}
                    </div>
                </div>
            `;
        });
    }
    $("#evidenceContainer").html(evdHtml);
    $("#evidenceCountBadge").text(`${evidence.length} Sources`);

    // Setup action buttons
    $("#btnDownloadPdf").off("click").on("click", function () {
        window.location.href = `/api/report/${currentAnalysisId}`;
    });
}

function copyShareableLink() {
    if (!currentAnalysisId) return;
    const shareUrl = `${window.location.origin}/detect.html?id=${currentAnalysisId}`;
    navigator.clipboard.writeText(shareUrl).then(function() {
        showToast("Audit Link Copied!", "Shareable analysis link copied to clipboard.");
    }).catch(function() {
        prompt("Copy this shareable analysis link:", shareUrl);
    });
}

function copyDebunkCard() {
    if (!currentAnalysisId) return;
    const badge = $("#resClassificationBadge").text().trim();
    const conf = $("#resConfidenceScore").text().trim();
    const claim = $(".claim-card p").first().text().replace(/"/g, '') || "News content";
    const text = `🔍 TruthLens AI Verification\nClassification: ${badge}\nConfidence: ${conf}\nAssertion: "${claim}"\nFull Audit Report: ${window.location.origin}/detect.html?id=${currentAnalysisId}`;
    navigator.clipboard.writeText(text).then(function() {
        showToast("Summary Copied!", "Debunk summary copied to clipboard.");
    }).catch(function() {
        prompt("Copy verification summary:", text);
    });
}

function showToast(title, msg) {
    let toast = $(`
        <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 99999;">
            <div class="toast show bg-dark text-light border border-primary shadow-lg p-3 rounded-3" role="alert">
                <div class="d-flex align-items-center mb-1">
                    <i class="fa fa-shield-alt text-primary me-2"></i>
                    <strong class="me-auto text-primary">${title}</strong>
                    <button type="button" class="btn-close btn-close-white ms-2" onclick="$(this).closest('.toast').remove()"></button>
                </div>
                <div class="small">${msg}</div>
            </div>
        </div>
    `);
    $("body").append(toast);
    setTimeout(() => toast.fadeOut(400, () => toast.remove()), 4000);
}

function scrollToEvidence() {
    $('html, body').animate({
        scrollTop: $("#evidenceSectionAnchor").offset().top - 90
    }, 600);
}

function scrollToClaims() {
    $('html, body').animate({
        scrollTop: $("#claimsSectionAnchor").offset().top - 90
    }, 600);
}

function sendFeedback(isUseful) {
    if (!currentAnalysisId) return;
    const type = isUseful ? "USEFUL_YES" : "USEFUL_NO";
    $.ajax({
        url: "/api/feedback",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            analysis_id: currentAnalysisId,
            feedback_type: type,
            comment: `User marked analysis useful: ${isUseful}`
        }),
        success: function () {
            $("#feedbackPromptArea").html('<div class="text-success"><i class="fa fa-check-circle me-1"></i>Thank you for your feedback!</div>');
        }
    });
}

function reportIssue(issueType) {
    if (!currentAnalysisId) return;
    $.ajax({
        url: "/api/feedback",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            analysis_id: currentAnalysisId,
            feedback_type: issueType,
            comment: `Reported issue: ${issueType}`
        }),
        success: function () {
            alert(`Issue "${issueType}" reported to model audit queue. Thank you for helping refine truth calibration.`);
        }
    });
}

function submitContactFeedback(event) {
    event.preventDefault();
    const payload = {
        name: $("#contactName").val(),
        email: $("#contactEmail").val(),
        subject: $("#contactSubject").val(),
        comment: $("#contactMessage").val(),
        feedback_type: $("#contactInquiryType").val() || "GENERAL_CONTACT"
    };

    $.ajax({
        url: "/api/contact",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(payload),
        success: function (res) {
            $("#contactStatusMsg").html(`
                <div class="alert alert-success mt-3 shadow border-0" style="background: rgba(40, 167, 69, 0.2); border-left: 4px solid #28a745 !important;">
                    <h6 class="text-success mb-1"><i class="fa fa-check-circle me-2"></i>Inquiry Submitted</h6>
                    <p class="mb-1 text-light small">${res.message}</p>
                    <span class="badge bg-dark border border-secondary text-primary">Ticket: ${res.ticket_id}</span>
                </div>
            `);
            $("#contactForm")[0].reset();
        },
        error: function () {
            $("#contactStatusMsg").html('<div class="alert alert-danger mt-3">Failed to send message. Please try again.</div>');
        }
    });
}

function loadLiveStatistics() {
    $.getJSON("/api/stats", function (data) {
        $("#statAnalyses").text(data.total_analyses.toLocaleString() + "+");
        $("#statClaims").text(data.total_claims.toLocaleString() + "+");
        $("#statSources").text(data.total_sources.toLocaleString() + "+");
        $("#statCoverage").text(data.system_coverage);
    }).fail(function () {
        // Fallback default
        $("#statAnalyses").text("10,000+");
        $("#statClaims").text("7,500+");
        $("#statSources").text("4,200+");
        $("#statCoverage").text("95%");
    });
}

let allHistoryRecords = [];

function loadHistoryTable() {
    if ($("#historyTableBody").length === 0) return;

    $.getJSON("/api/history", function (records) {
        allHistoryRecords = records || [];
        renderFilteredHistory(allHistoryRecords);
    });
}

function renderFilteredHistory(records) {
    let html = "";
    if (records.length === 0) {
        html = '<tr><td colspan="6" class="text-center text-muted py-4">No matching analysis records found.</td></tr>';
    } else {
        records.forEach(r => {
            let badgeClass = "badge-unverified";
            if (r.classification === "REAL") badgeClass = "badge-real";
            else if (r.classification === "FAKE") badgeClass = "badge-fake";
            else if (r.classification === "MISLEADING") badgeClass = "badge-misleading";

            html += `
                <tr id="row-${r.analysis_id}">
                    <td><small class="text-muted">${r.created_at}</small></td>
                    <td><span class="badge bg-dark border border-secondary text-light">${(r.input_type || 'ARTICLE').toUpperCase()}</span></td>
                    <td><div class="text-truncate fw-bold text-light" style="max-width: 280px;" title="${r.title}">${r.title}</div><small class="text-muted">${r.analysis_id}</small></td>
                    <td><span class="badge ${badgeClass} px-2 py-1">${r.classification}</span></td>
                    <td><strong>${r.confidence_score}%</strong></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="viewHistoryItem('${r.analysis_id}')" title="Inspect Results"><i class="fa fa-eye"></i></button>
                        <a href="/api/report/${r.analysis_id}" class="btn btn-sm btn-outline-light me-1" title="Download PDF Report"><i class="fa fa-file-pdf"></i></a>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteHistoryItem('${r.analysis_id}')" title="Delete from Database"><i class="fa fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    }
    $("#historyTableBody").html(html);
}

function initHistorySearchAndFilters() {
    $("#historySearchInput").on("keyup", function () {
        const query = $(this).val().toLowerCase().trim();
        const activeFilter = $(".filter-pill.active").data("filter") || "ALL";
        applyHistoryFilters(query, activeFilter);
    });

    $(".filter-pill").on("click", function () {
        $(".filter-pill").removeClass("active");
        $(this).addClass("active");
        const activeFilter = $(this).data("filter") || "ALL";
        const query = $("#historySearchInput").val().toLowerCase().trim();
        applyHistoryFilters(query, activeFilter);
    });

    $("#btnExportCsv").on("click", function () {
        window.location.href = "/api/history/export?format=csv";
    });

    $("#btnExportJson").on("click", function () {
        window.location.href = "/api/history/export?format=json";
    });

    $("#btnClearHistory").on("click", function () {
        if (!confirm("Are you sure you want to clear ALL past analysis audit records? This cannot be undone.")) return;
        $.ajax({
            url: "/api/history",
            type: "DELETE",
            success: function (res) {
                showToast("History Cleared", res.message || "All records removed.");
                loadHistoryTable();
                loadLiveStatistics();
            }
        });
    });
}

function applyHistoryFilters(query, filter) {
    let filtered = allHistoryRecords.filter(r => {
        const matchesQuery = !query ||
            (r.title && r.title.toLowerCase().includes(query)) ||
            (r.analysis_id && r.analysis_id.toLowerCase().includes(query));

        const matchesFilter = (filter === "ALL") || (r.classification && r.classification.toUpperCase() === filter);
        return matchesQuery && matchesFilter;
    });
    renderFilteredHistory(filtered);
}

function viewHistoryItem(analysisId) {
    $.getJSON(`/api/analysis/${analysisId}`, function (data) {
        renderAnalysisResults(data);
        $('html, body').animate({
            scrollTop: $("#analysisResultsArea").offset().top - 80
        }, 500);
    }).fail(function() {
        alert("Could not load analysis record " + analysisId);
    });
}

function deleteHistoryItem(analysisId) {
    if (!confirm(`Are you sure you want to permanently delete record ${analysisId}?`)) return;
    $.ajax({
        url: `/api/analysis/${analysisId}`,
        type: "DELETE",
        success: function () {
            $(`#row-${analysisId}`).fadeOut(300, function() { $(this).remove(); });
            allHistoryRecords = allHistoryRecords.filter(r => r.analysis_id !== analysisId);
            showToast("Record Deleted", `Analysis ${analysisId} removed from database.`);
            loadLiveStatistics();
        }
    });
}

/* Side-by-Side Comparison Feature */
function initComparisonMode() {
    $("#btnToggleCompareMode").on("click", function () {
        $("#singleModeWorkbench").toggleClass("d-none");
        $("#compareModeWorkbench").toggleClass("d-none");
        const isCompare = !$("#compareModeWorkbench").hasClass("d-none");
        $(this).html(isCompare ? '<i class="fa fa-newspaper me-1"></i> SINGLE ARTICLE MODE' : '<i class="fa fa-columns me-1"></i> SIDE-BY-SIDE COMPARISON');
    });

    $("#executeCompareBtn").on("click", function () {
        const textA = $("#compareTextA").val().trim();
        const textB = $("#compareTextB").val().trim();
        const titleA = $("#compareTitleA").val().trim() || "Article A";
        const titleB = $("#compareTitleB").val().trim() || "Article B";

        if (!textA || !textB) {
            alert("Please paste text for both Article A and Article B to compare.");
            return;
        }

        $(this).prop("disabled", true).html('<i class="fa fa-spinner fa-spin me-2"></i>COMPARING BIAS & CREDIBILITY...');

        $.ajax({
            url: "/api/compare",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                article_a: textA,
                article_b: textB,
                title_a: titleA,
                title_b: titleB
            }),
            success: function (res) {
                $("#executeCompareBtn").prop("disabled", false).html('<i class="fa fa-balance-scale me-2"></i>COMPARE CREDIBILITY & BIAS');
                renderComparisonResults(res);
            },
            error: function (xhr) {
                $("#executeCompareBtn").prop("disabled", false).html('<i class="fa fa-balance-scale me-2"></i>COMPARE CREDIBILITY & BIAS');
                const err = xhr.responseJSON ? xhr.responseJSON.detail : "Comparison failed.";
                alert("Error: " + err);
            }
        });
    });
}

function renderComparisonResults(data) {
    const a = data.article_a;
    const b = data.article_b;
    const comp = data.comparison;

    $("#compTitleA").text(a.title);
    $("#compTitleB").text(b.title);

    $("#compCredA").text(a.credibility_score + "%");
    $("#compCredB").text(b.credibility_score + "%");

    $("#compCircleA").css("background", a.credibility_score >= 50 ? "rgba(40,167,69,0.2)" : "rgba(220,53,69,0.2)")
                     .css("color", a.credibility_score >= 50 ? "#4cd964" : "#ff6b6b");
    $("#compCircleB").css("background", b.credibility_score >= 50 ? "rgba(40,167,69,0.2)" : "rgba(220,53,69,0.2)")
                     .css("color", b.credibility_score >= 50 ? "#4cd964" : "#ff6b6b");

    $("#compSensA").text(a.metrics.sensationalism_signal + ` (${a.metrics.sensationalism_score})`);
    $("#compSensB").text(b.metrics.sensationalism_signal + ` (${b.metrics.sensationalism_score})`);

    $("#compClickA").text(a.metrics.clickbait_signal + ` (${a.metrics.clickbait_score})`);
    $("#compClickB").text(b.metrics.clickbait_signal + ` (${b.metrics.clickbait_score})`);

    $("#compSentA").text(a.metrics.sentiment_label + ` (${a.metrics.sentiment_score})`);
    $("#compSentB").text(b.metrics.sentiment_label + ` (${b.metrics.sentiment_score})`);

    $("#compVerdictText").text(comp.summary_verdict);
    $("#compWinnerBadge").text("MORE OBJECTIVE: " + comp.more_credible);

    $("#compareResultsArea").removeClass("d-none");
    $('html, body').animate({
        scrollTop: $("#compareResultsArea").offset().top - 80
    }, 600);
}

