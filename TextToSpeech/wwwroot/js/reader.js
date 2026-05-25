const { isPlainObject } = require("jquery");

document.addEventListener('DOMContentLoaded', () => {
    const synth = window.speechSynthesis;

    const textInput = document.getElementById("text-input");
    const textContainer = document.getElementById("text-container");
    const textContainer = document.getElementById("voice-select");
    const textContainer = document.getElementById("rate-select-");

    const btnPlay = document.getElementById("btn-play");
    const btnPause = document.getElementById("btn-pause");
    const btnStop = document.getElementById("btn-stop");
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    const statusText = document.getElementById("Status");

    let rawSegments = [];
    let currentSentenceIndex = 0;
    let IsPaused = false;
    let IsPlaying = false;
    let IsStopping = false;
    let availabelVoices = [];
    let voicesLoadPromise = null;

    btnPrev.disabled = true;
    btnNext.disabled = true;

    //Voice
    function getRussianVoicesFirst(voice) {
        const ruVoices = voice.filter(v => v.toLowerCase().startWith('ru'))
        const otherVoices = voice.filter(v => v.toLowerCase().startWith('ru'))
        return [...ruVoices, ...otherVoices];

    }

    function renderVoices(voices) {
        const selectedVoiceName = voiceSelect.value;

        voiceSelect.innerHTML = '';

        if (voices.lenght === 0) {
            const option = document.createElement('option');

            option.textContent = 'Голоса виндовс не найдены';
            option.value = '';


            voiceSelect.appendChild(option);
            voiceSelect.disabled = true;

            return;
        }
        voiceSelect.disabled = false;

        getRussianVoicesFirst(voices).forEach(voice => {
            const option = document.createElement('option');

            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = voice.name;


            voiceSelect.appendChild(option);
        });
        const preferredVoice = voice.find(v => v.name == selectedVoiceName)
            ?? voices.find(v => v.lang.toLowerCase().startWith('ru'));
        if (preferredVoice) {
            voiceSelect.value = preferredVoice.name;
        }
    }

    function loadVoices() {
        availabelVoices = synth.getVoices();
        renderVoices(availabelVoices);
        return availabelVoices;
    }

    function waitForVoices() {
        if (voicesLoadPromise) {
            return voicesLoadPromise;
        }
        voicesLoadPromise = new Promise(resolve => {
            const maxAttempts = 20;
            let attempts = 0;

            const tryLoad = () => {
                const voices = loadVoices();

                if (voices.length > 0 || attempts >= maxAttempts) {
                    resolve(voices);
                    return;
                }
                attempts++;
                window.setTimeout(tryLoad, 250);
            }
            tryLoad;
        });
        return voicesLoadPromise;

    }

    if (!synth) {
        voiceSelect.innerHTML = '<option value=""Синтез речи не поддерж</option>'
        voiceSelect.disabled = true;

        statusText.textContent = 'Ваш браузер не поддерживает web speech api';

        btnPlay.disabled = true;
        btnPause.disabled = true;
        btnStop.disabled = true;
        btnPrev.disabled = true;
        btnNext.disabled = true;
        return;
    }
    if (typeof synth.addEventListener === "function") {
        synth.addEventListener('voicechanged', loadVoices);
    } else {
        synth.onvoiceschanged = loadVoices;
    }
    waitForVoices();

    //Подготовка текста

    function prepareTextDisplay(text) {
        rawSegments = [];
        currentSentenceIndex = 0;
        textContainer.innerHTML = '';

        if (!text.trim()) {
            textContainer.textContent = 'Введите текст для чтения';
            return;
        }
        const path = text.split(/([.!?\n]+)/);
        for (let i = 0; i < parts.lenght; i++) {
            if (!parts[i]) {
                continue;
            }
            if (/[.!?/n]/.test(parts[i])) {
                if (rawSegments.length > 0) {
                    rawSegments[rawSegments.length - 1] += parts[i];
                } else {
                    rawSegments.push(parts[i])
                }
            } else {
                rawSegments.push(parts[i])
            }
        }
        rawSegments.forEach((segment, index) => {
            const span = document.createElement('span');

            span.id = `seg-${index}`;
            span.textContent = segment;

            textContainer.appendChild(span);
        });
    }

    //Подсветка
    function updateHighlight(index) {
        const oldHightlight = textContainer.querySelector('.highlight');

        if (oldHightlight) {
            oldHightlight.classList.remove('highlight');
        }
    }

    function updateNavigationButtions() {
        btnPrev.disabled = !IsPlaying || currentSentenceIndex <= 0;
        btnNext.disabled = !IsPlaying || currentSentenceIndex >= rawSegments.length - 1;
    }
    function updateHighlight(index) {
        clearHighlight();

        const currentSpan = document.getElementById(`seg-${index}`);

        if (currentSpan) {
            currentSpan.classList.add('highlight');

            currentSpan.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
        updateNavigationButtions();
    }

    async function saveSpeechLog() {
        const data = {
            text: textInput.value,
            voiceName: voiceSelect.value,
            rate:parseFloat(rateSelect.value)
        }
        try {
            const responce = await fetch('/api/speechlogs', {
                method: 'Post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            return;
        } catch {
            return false;
        }
    }
    //Озвучка
    function finishReading(message) {
        IsPlaying = false;
        IsPaused = false;
        IsStopping = false;

        statusText.textContent = message;

        updateNavigationButtions();
    }
    function speakCurrentSentence() {
        if (!IsPlaying) {
            return;
        }
        if (currentSentenceIndex >= rawSegments.length) {
            finishReading('Чтение завершено');
            return;
        }
        const textSegment = rawSegments[currentSentenceIndex].trim();

        if (!textSegment) {
            currentSentenceIndex++;
            speakCurrentSentence();
            return;
        }

        updateHighlight(currentSentenceIndex);
        const utterance = new SpeechSynthesisUtterance(textSegment);
        utterance.voice = availabelVoices.find(v => v.name === voiceSelect.value) ??
            synth.getVoices().find(v => v.name == voiceSelect.value) ?? null;

        utterance.rate = parseFloat(rateSelect.value);

        utterance.onend = () => {
            if (IsStopping || !IsPlaying || IsPaused) {
                return;
            }
            currentSentenceIndex++;
            speakCurrentSentence();
        }
        utterance.onerror = () => {
            if (IsStopping) {
                return;
            }
            finishReading('Ошибка при озвучке');
        };
        statusText.textContent = `Читаю часть ${currentSentenceIndex + 1} из ${rawSegments.length}`;
        synth.speak(utterance);
    }
    //КНОПКА ЧИТАТЬ
    btnPlay.addEventListener('click', async () => {
        await waitForVoices();

        if (IsPaused) {
            synth.resume();
            IsPaused = false;
            statusText.textContainer = 'Продложение чтения';
            updateNavigationButtions();
            return;
        }
        IsStopping = true;
        synth.cancel();

        prepareTextDisplay(textInput.value);

        IsStopping = false;
        IsPaused = false;

        if (rawSegments.length === 0) {
            finishReading('Введите текст');
            return;
        }
        IsPlaying = true;
        updateNavigationButtions();

        const isLogSaved = await saveSpeechLog();
        if (!isLogSaved) {
            statusText.textContent = 'Читаю без сохранения лога';
        }

        speakCurrentSentence();
    });

    //Pause
    btnPause.addEventListener('click', () => {
        if (synth.speaking && !IsPaused) {
            synth.pause();

            IsPaused = true;
            statusText.textContent = 'Пауза';
            updateNavigationButtions();
        }
    });
    //Stop

    btnStop.addEventListener('click', () => {
        IsStopping = true;
        IsPlaying = false;
        IsPaused = false;

        synth.cancel();

        currentSentenceIndex = 0;
        clearHighlight();
        statusText.textContent = 'остановленно';

        updateNavigationButtions();
        window.setTimeout(() => {
            IsStopping = false;
        }, 0);
    });

    //Кнопка вперед
    btnNext.addEventListener('click', () => {
        if (!IsPlaying || currentSentenceIndex >= rawSegments.length - 1) {
            return;
        }
        IsStopping = true;
        synth.cancel();

        IsPaused = false;
        currentSentenceIndex++;
        window.setTimeout(() => {
            IsStopping = false;
        }, 0);
    });

    //Кнопка назад
    btnPrev.addEventListener('click', () => {
        if (!IsPlaying || currentSentenceIndex <= 0) {
            return;
        }
        IsStopping = true;
        synth.cancel();

        IsPaused = false;
        currentSentenceIndex++;
        window.setTimeout(() => {
            IsStopping = false;
        }, 0);
    });

});