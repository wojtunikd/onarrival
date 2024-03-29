const StudentUser = require("../models/student-user");
const Company = require("../models/company");
const VocabExercise = require("../models/vocab-exercise");
const ComprehensionEx = require("../models/comprehension-exercise");
const Word = require("../models/word");
const Question = require("../models/question");
const Answer = require("../models/answer");
const Score = require("../models/score");
const Recognition = require("../models/recognition");

const WordList = require("./pdf-functions/wordlist");

const path = require('path');

const aws = require('aws-sdk');
const S3_BUCKET = process.env.S3_BUCKET_NAME;
aws.config = {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};
const s3 = new aws.S3();

const fs = require("fs");

exports.getPanelPage = async (req, res, next) => {
    const company = await Company.findOne({ where: { id: req.session.company.id } });
    const user = await StudentUser.findOne({ where: { id: req.session.userId } });
    
    res.render("panel/student-main", {
        pageTitle: "Main Panel",
        company: company,
        user: user,
        course: req.session.course,
        chapters: req.session.chapters
    });
};

exports.getChapterVocabEx = async (req, res, next) => {
    const company = await Company.findOne({ where: { id: req.session.company.id } });
    const user = await StudentUser.findOne({ where: { id: req.session.userId } });

    res.render("panel/chapter-vocab-ex", {
        pageTitle: "Vocabulary Exercises",
        company: company,
        user: user,
        course: req.session.course,
        chapters: req.session.chapters,
        vocabEx: req.vocabEx
    });
};

exports.getChapterLearningVocabEx = async (req, res, next) => {
    const company = await Company.findOne({ where: { id: req.session.company.id } });
    const user = await StudentUser.findOne({ where: { id: req.session.userId } });

    let listOfLearningEx = [];

    for(let i=0; i<req.vocabEx.length; i++) {
        if(req.vocabEx[i].type=="Learning") {
            listOfLearningEx.push(req.vocabEx[i]);
        }
    };

    res.render("panel/learning-vocab-ex", {
        pageTitle: "Learning Vocabulary Exercises",
        company: company,
        user: user,
        course: req.session.course,
        chapters: req.session.chapters,
        vocabEx: listOfLearningEx
    });
};

exports.getChapterQuizVocabEx = async (req, res, next) => {
    const company = await Company.findOne({ where: { id: req.session.company.id } });
    const user = await StudentUser.findOne({ where: { id: req.session.userId } });

    let listOfQuizEx = [];

    for(let i=0; i<req.vocabEx.length; i++) {
        if(req.vocabEx[i].type=="Quiz") {
            listOfQuizEx.push(req.vocabEx[i]);
        }
    };

    res.render("panel/quiz-vocab-ex", {
        pageTitle: "Quiz Exercises",
        company: company,
        user: user,
        course: req.session.course,
        chapters: req.session.chapters,
        vocabEx: listOfQuizEx
    });
};

exports.learningVocabEx = async (req, res, next) => {
    const company = await Company.findOne({ where: { id: req.session.company.id } });
    const user = await StudentUser.findOne({ where: { id: req.session.userId } });
    const exercise = await VocabExercise.findOne({ where: { id: req.exId } });

    if(exercise.disabled) {
        return res.redirect("/student/panel?disabled=true");
    };

    res.render("panel/learning-ex-words", {
        pageTitle: "Quiz Exercises",
        company: company,
        user: user,
        course: req.session.course,
        chapters: req.session.chapters,
        exercise: exercise
    });
};

exports.findExerciseWords = async (req, res, next) => {
    let remainingWords = [];
    const wordsRemembered = await Recognition.findAll({ where: { StudentUserId: req.session.userId } });
    const words = await Word.findAll({ where: { VocabExerciseId: req.query.id } });
    let IDsRemembered = [];

    for(let i=0; i<wordsRemembered.length; i++) {
        IDsRemembered.push(wordsRemembered[i].WordId);
    }
    
    for(let i=0; i<words.length; i++) {
        if(!(IDsRemembered.includes(words[i].id))) {
            remainingWords.push(words[i]);
        }
    }

    res.status(201).json({
        words: remainingWords
    });
};

exports.setWordRemembered = async (req, res, next) => {
    await Recognition.create({ 
        WordId: req.query.id,
        StudentUserId: req.session.userId
    });

    res.status(201).json({
        remembered: true
    });
};

exports.getMaterialsPage = async (req, res) => {
    const company = await Company.findOne({ where: { id: req.session.company.id } });
    const user = await StudentUser.findOne({ where: { id: req.session.userId } });
    
    res.render("panel/view-materials", {
        pageTitle: "View Study Materials",
        company: company,
        user: user,
        course: req.session.course,
        chapters: req.session.chapters,
        materials: req.studyMaterials
    });
}

exports.downloadMaterial = async (req, res) => {
    var fstream = fs.createWriteStream("files/" + req.body.nameOfFile);
    var s3fstream = s3.getObject({Bucket: S3_BUCKET, Key: req.body.nameOfFile}).createReadStream();

    s3fstream.on('error', error => {
        console.log(error);
    });
    
    s3fstream.pipe(fstream).on('error', error => {
        console.log(error);
    }).on('close', () => {
        res.download("files/" + req.body.nameOfFile);
    });
};

exports.getComprehensionPage = async (req, res) => {
    const company = await Company.findOne({ where: { id: req.session.company.id } });
    const user = await StudentUser.findOne({ where: { id: req.session.userId } });

    const score = await Score.findAll({ where: { StudentUserId: user.id } });
    let compExCompleted = [];

    score.forEach((result, i) => {
        compExCompleted.push(result.ComprehensionExerciseId);
    });

    res.render("panel/view-comprehension", {
        pageTitle: "View Comprehension Exercises",
        path: "/student/chapters/" + req.chapterID + "/comprehension",
        company: company,
        user: user,
        course: req.session.course,
        chapters: req.session.chapters,
        exercises: req.exercises,
        completed: compExCompleted
    });
};

exports.viewComprehension = async (req, res) => {
    const company = await Company.findOne({ where: { id: req.session.company.id } });
    const user = await StudentUser.findOne({ where: { id: req.session.userId } });

    const exercise = await ComprehensionEx.findOne({ where: { id: req.params.compExId } });   

    const score = await Score.findAll({ where: { StudentUserId: user.id } });
    let compExCompleted = [];

    score.forEach((result, i) => {
        compExCompleted.push(result.ComprehensionExerciseId);
    });
    
    if(compExCompleted.includes(exercise.id)) {
        res.redirect("/student/panel");
    } else {
        res.render("panel/complete-comprehension", {
            pageTitle: "Complete the Comprehension Exercise",
            company: company,
            user: user,
            course: req.session.course,
            chapters: req.session.chapters,
            exercise: exercise
        });
    }
};

exports.getAudio = async (req, res) => {
    ComprehensionEx.findOne({ where: { id: req.query.id } })
        .then(exercise => {

            var fstream = fs.createWriteStream(path.join(__dirname, "..", "public", "recordings", exercise.file));
            var s3fstream = s3.getObject({Bucket: S3_BUCKET, Key: exercise.file}).createReadStream();

            s3fstream.on('error', error => {
                console.log(error);
            });
            
            s3fstream.pipe(fstream).on('error', error => {
                console.log(error);
            }).on('close', () => {
                res.status(200).json({
                    file: exercise.file
                });
            });
        })
        .catch(error => { console.log(error); })
};

exports.getTranslation = async (req, res) => {
    ComprehensionEx.findOne({ where: { id: req.query.id } })
        .then(exercise => {
            res.status(200).json({
                translation: exercise.textFor
            });
        })
        .catch(error => { console.log(error); })
};

exports.getTestQuestions = (req, res) => {
    ComprehensionEx.findOne({ where: { id: req.query.id } })
        .then(exercise => {
            Question.findAll({ where: { ComprehensionExerciseId: exercise.id } })
                .then(async questions => {
                    let questionsWithAnswers = [];
                    for(let i=0; i<questions.length; i++) {
                        let answers = await Answer.findAll({ where: { QuestionId: questions[i].id } });
                        let queWithAns = [questions[i], answers];
                        questionsWithAnswers.push(queWithAns);
                    }

                    res.status(200).json({
                        questions: JSON.stringify(questionsWithAnswers)
                    });
                })
                .catch(error => {
                    console.log(error);
                })
        })
        .catch(error => { console.log(error); })
};

exports.saveTestResult = async (req, res) => {
    ComprehensionEx.findOne({ where: { id: req.query.id } })
        .then(async exercise => {
            exercise.isCompleted = 1;
            await exercise.save();

            const result = await Score.create({
                pointsReceived: req.query.totalScore,
                pointsMax: req.query.maxScore,
                ComprehensionExerciseId: exercise.id,
                StudentUserId: req.session.userId
            });

            res.status(201).json({
                result: result
            });
        })
        .catch(error => { console.log(error); })
};

exports.getResultsInChapter = async (req, res) => {
    const company = await Company.findOne({ where: { id: req.session.company.id } });
    const user = await StudentUser.findOne({ where: { id: req.session.userId } });

    ComprehensionEx.findAll({ where: { ChapterId: req.params.resultChapterId } })
        .then(async exercises => {
            let resultsToSend = [];

            for(let i=0; i<exercises.length; i++) {
                let score = await Score.findOne({ where: { ComprehensionExerciseId: exercises[i].id } });
                if(!(score == null)) {
                    resultsToSend.push([exercises[i].name, score]);
                }
            }

            res.render("panel/view-results", {
                pageTitle: "View Your Results",
                company: company,
                user: user,
                course: req.session.course,
                chapters: req.session.chapters,
                results: resultsToSend
            });
        })
        .catch(error => { console.log(error); })
};

exports.getFullName = async (req, res, next) => {
    const student = await StudentUser.findOne({ where: { id: req.session.userId } });

    res.status(201).json({
        fullName: student.name + " " + student.surname
    });
};

exports.downloadListWords = async (req, res, next) => {
    const exercise = await VocabExercise.findOne({ where: { id: req.body.exerciseId } });
    const list = await Word.findAll({ where: { VocabExerciseId: exercise.id } });

    let pdf = WordList.generatePDF(exercise, list);
    let pathPDF = path.join(__dirname, "..", "public", Date.now() + "_PDF_" + exercise.name + ".PDF");

    pdf.pipe(fs.createWriteStream(pathPDF))
        .on("finish", () => {
            res.download(pathPDF);
        })
};