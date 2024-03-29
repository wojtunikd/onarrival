// TODO: Change accountData to middleware

const bcrypt = require("bcryptjs");
const cryptoRandomString = require('crypto-random-string');

const EnterpriseUser = require("../models/enterprise-user");
const Company = require("../models/company");
const Course = require("../models/course");
const Chapter = require("../models/chapter");
const StudentUser = require("../models/student-user");
const Score = require("../models/score");
const ComprehensionExercise = require("../models/comprehension-exercise");
const VocabularyExercise = require("../models/vocab-exercise");
const Verification = require("../models/verification");

const { 
    REGISTER_COMPANY, 
    NEW_REPRESENTATIVE, 
    UPDATE_LEADER 
} = require("../utils/form-schemas/enterprise-forms");

const {
    sendEmailVerification
} = require("../utils/emails/email-senders");

const { StatusCodes } = require("http-status-codes");

exports.registerCompanyUser = async (req, res) => {
    let validForm, user, company, verification;

    try {
        validForm = await REGISTER_COMPANY.validateAsync(req.body);
    } catch(error) {
        console.log(error);
        return res.redirect("/register?correct=false");
    }

    try {
        user = await EnterpriseUser.findOne({ where: { email: validForm.adminEmail } });
    } catch(error) {
        console.log(error);
        return res.redirect("/register?success=false");
    }

    if(user) return res.redirect("/register?success=false");

    try {
        company = await Company.create({
            name: validForm.companyName,
            email: validForm.companyEmail,
            telNum: validForm.companyTel
        })
    } catch(error) {
        console.log(error);
        return res.redirect("/register?success=false");
    }

    if(!company) return res.redirect("/register?success=false");

    const hashedPass = await bcrypt.hash(validForm.adminPassword, 12);

    try {
        user = await EnterpriseUser.create({
            email: validForm.adminEmail,
            password: hashedPass,
            name: validForm.adminName,
            surname: validForm.adminSurname,
            department: validForm.adminDep,
            isAdmin: true,
            disabled: true,
            CompanyId: company.id
        })
    } catch(error) {
        console.log(error);
        cleanUp(company, null);
        return res.redirect("/register?success=false");
    }

    if(!user) {
        cleanUp(company, null);
        return res.redirect("/register?success=false");
    }

    const verificationCode = cryptoRandomString({ length: 14 });
    
    try {
        verification = await Verification.create({ EnterpriseUserId: user.id, VerificationCode: verificationCode });
    } catch(error) {
        console.log(error);
        cleanUp(company, user);
        return res.redirect("/register?success=false");
    }

    if(!verification) {
        cleanUp(company, user);
        return res.redirect("/register?success=false");
    }

    sendEmailVerification(user, verificationCode);

    res.redirect("/register?success=true");
    
    const cleanUp = async (company, user) => {
        try {
            if(company) await company.destroy();
            if(user) await user.destroy();
        } catch(error) {
            console.log(error);
        }
    }
}

exports.getPanelPage = async (req, res) => {
    let user;

    try {
        user = await EnterpriseUser.findOne({
            where: { id: req.session.userId },
            include: [
                {
                    model: Company,
                    attributes: ["id", "name"],
                    required: true
                }, 
                {
                    model: Course,
                    attributes: ["id", "title"]
                }
            ]
        })
    } catch(error) {
        console.log(error);
        return res.redirect("/error");
    }

    if(!user) return res.redirect("/error");

    !!user.Course.title ? req.session.courseTitle = user.Course.title : req.session.courseTitle = "";

    req.session.fullName = user.name + " " + user.surname;
    req.session.companyName = user.Company.name;
    
    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];
    
    res.render("panel/company-main", {
        pageTitle: "Main Panel",
        isAdmin: req.session.isAdmin,
        isLeader: req.session.isLeader,
        company: user.Company,
        user: user,
        course: user.Course,
        accountData: accountData
    })
}

exports.getAddRepresentativePage = (req, res) => {
    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];

    res.render("panel/add-leader", {
        pageTitle: "Add a New Course Leader",
        isAdmin: req.session.isAdmin,
        isLeader: req.session.isLeader,
        success: req.query.success,
        accountData: accountData
    })
}

exports.getAddCoursePage = (req, res) => {
    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];

    res.render("panel/add-course", {
        pageTitle: "Add a New Course",
        isAdmin: req.session.isAdmin,
        isLeader: req.session.isLeader,
        success: req.query.success,
        accountData: accountData
    })
}

exports.addNewRepresentative = async (req, res) => {
    let validForm, user;

    try {
        validForm = await NEW_REPRESENTATIVE.validateAsync(req.body);
    } catch(error) {
        console.log(error);
        return res.redirect("/enterprise/leaders/add?success=false");
    }

    const hashedPass = await bcrypt.hash(validForm.pass, 12);

    try {
        user = await EnterpriseUser.create({
            email: validForm.email,
            password: hashedPass,
            name: validForm.name,
            surname: validForm.surname,
            department: validForm.dep,
            isAdmin: !!validForm.adminRights,
            CompanyId: req.session.companyId
        })
    } catch(error) {
        console.log(error);
        return res.redirect("/enterprise/leaders/add?success=false");
    }

    if(!user) return res.redirect("/enterprise/leaders/add?success=false");

    sendNewRepresentativeEmail();

    return res.redirect("/enterprise/leaders/add?success=true");
}

exports.getEditLeaderPage = async (req, res) => {
    let leader;

    try {
        leader = await EnterpriseUser.findByPk(req.params.id);
    } catch(error) {
        console.log(error);
        return res.redirect("/enterprise/leaders/view?error=true");
    }

    if(!leader) return res.redirect("/enterprise/leaders/view?error=true");

    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];

    res.render("panel/edit-leader", {
        pageTitle: "Edit a Course Leader",
        isAdmin: req.session.isAdmin,
        isLeader: req.session.isLeader,
        success: req.query.success,
        accountData: accountData,
        leader: leader
    })
}

exports.updateLeader = async (req, res) => {
    let validForm, leader;

    try {
        validForm = await UPDATE_LEADER.validateAsync(req.body);
    } catch(error) {
        console.log(error);
        return res.redirect("/enterprise/leaders/view?error=true");
    }

    try {
        leader = await EnterpriseUser.findByPk(req.params.id);
    } catch(error) {
        console.log(error);
        return res.redirect("/enterprise/leaders/view?error=true");
    }

    if(!leader) return res.redirect("/enterprise/leaders/view?error=true");

    if(!!validForm.email) leader.email = validForm.email;
    if(!!validForm.name) leader.name = validForm.name;
    if(!!validForm.surname) leader.surname = validForm.surname;
    if(!!validForm.dep) leader.department = validForm.dep;
    if(validForm.adminRights) leader.isAdmin = validForm.adminRights;

    if(!!validForm.pass) {
        const hashedPass = await bcrypt.hash(validForm.pass, 12);
        leader.password = hashedPass;
    }

    try {
        await leader.save();
    } catch(error) {
        console.log(error);
        return res.redirect("/enterprise/leaders/view?error=true");
    }

    return res.redirect("/enterprise/leaders/view");
}

exports.getAssignCoursePage = async (req, res, next) => {
    const employees = await EnterpriseUser.findAll({ where: { CompanyId: req.session.companyId, CourseId: null } });
    const courses = await Course.findAll({ where: { CompanyId: req.session.companyId, hasLeader: 0 } });
    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];

    res.render("panel/assign-course", {
        pageTitle: "Assign a Course",
        isAdmin: req.session.isAdmin,
        isLeader: req.session.isLeader,
        success: req.query.success,
        leaders: employees,
        courses: courses,
        accountData: accountData
    });
};

exports.getChangeAssignCoursePage = async (req, res, next) => {
    const employees = await EnterpriseUser.findAll({ where: { CompanyId: req.session.companyId } });
    const courses = await Course.findAll({ where: { CompanyId: req.session.companyId } });
    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];

    res.render("panel/change-assign", {
        pageTitle: "Change a Course Assignment",
        isAdmin: req.session.isAdmin,
        isLeader: req.session.isLeader,
        success: req.query.success,
        leaders: employees,
        courses: courses,
        accountData: accountData
    });
};

exports.getEnrolStudentPage = async (req, res, next) => {
    const students = await StudentUser.findAll({ where: { CompanyId: req.session.companyId } });
    const courses = await Course.findAll({ where: { CompanyId: req.session.companyId } });
    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];

    res.render("panel/enrol-student", {
        pageTitle: "Enrol a Student to a Course",
        isAdmin: req.session.isAdmin,
        isLeader: req.session.isLeader,
        success: req.query.success,
        students: students,
        courses: courses,
        accountData: accountData
    });
};

exports.getStudentResultsPage = async (req, res, next) => {
    const students = await StudentUser.findAll({ where: { CompanyId: req.session.companyId } });
    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];

    res.render("panel/student-results", {
        pageTitle: "View Students' Results",
        isAdmin: req.session.isAdmin,
        isLeader: req.session.isLeader,
        success: req.query.success,
        students: students,
        accountData: accountData
    });
};

exports.enrolStudent = async (req, res, next) => {
    const course = await Course.findOne({ where: { id: req.body.coursesToAssign } });
    const student = await StudentUser.findOne({ where: { id: req.body.studentsToAssign } });

    student.setCourse(course);
    student.save();

    res.redirect("/enterprise/students/enrol?success=true");

    const msg = {
        to: student.email,
        from: "contact@onarrival.uk",
        subject: "OnArrivalUK - You are enroled to a new course",
        text: "Dear " + student.name + ", This is to inform you that you have just been enroled to the " + course.title + " language course designed by your employer. Log in to you OnArrivalUK account to gain access to it and begin improving your English skills. Have a lovely day, OnArrivalUK",
        html: "Dear " + student.name + ", <br /><br />This is to inform you that you have just been enroled to the " + course.title + " language course designed by your employer. Log in to you OnArrivalUK account to gain access to it and begin improving your English skills.<br /><br />Have a lovely day, <br />OnArrivalUK<br /><img src='https://i.imgur.com/gI3MKyK.jpg' alt='LonAUK Logo'>"
    }

    return sgMail.send(msg);
};

exports.addNewCourse = async (req, res, next) => {
    const company = await Company.findOne({ where: { id: req.session.companyId } });

    Course.create({
        title: req.body.title,
        description: req.body.description,
        mainLanguage: req.body.language,
        difficulty: req.body.diff,
    })
        .then(course => {
            course.setCompany(company);

            return res.redirect("/enterprise/courses/add?success=true");
        })
        .catch(error => {
            console.log(error);
            return res.redirect("/enterprise/courses/add?success=false");
        })
};

exports.getEditCoursePage = async (req, res, next) => {
    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];
    const course = await Course.findOne({ where: { id: req.params.id } });

    res.render("panel/edit-course", {
        pageTitle: "Edit a Course",
        isAdmin: req.session.isAdmin,
        isLeader: req.session.isLeader,
        success: req.query.success,
        accountData: accountData,
        course: course
    });
};

exports.updateCourse = async (req, res, next) => {
    const course = await Course.findOne({ where: { id: req.params.id } });

    course.title = req.body.title;
    course.description = req.body.description;
    course.mainLanguage = req.body.language;
    course.difficulty =  req.body.diff;
    await course.save();

    return res.redirect("/enterprise/courses/view");
};

exports.assignCourse = async (req, res, next) => {
    const course = await Course.findOne({ where: { id: req.body.coursesToAssign } });
    const leader = await EnterpriseUser.findOne({ where: { id: req.body.leadersToAssign } });

    leader.setCourse(course);
    await leader.save();

    course.hasLeader = 1;
    await course.save();

    if(leader.id == req.session.userId) {
        req.session.isLeader = 1;
        req.session.leadingCourse = course;
        req.session.courseTitle = course.title;

        res.redirect("/enterprise/courses/assign?success=true&self=true");
    } else {
        res.redirect("/enterprise/courses/assign?success=true");
    }

    const msg = {
        to: leader.email,
        from: "contact@onarrival.uk",
        subject: "OnArrivalUK - You are now a Course Leader!",
        text: "Dear " + leader.name + ", This is to inform you that you have been appointed a Course Leader of " + course.title + ". Login to your OnArrivalUK account to begin creating exciting content for your employees. Have a lovely day, OnArrivalUK",
        html: "Dear " + leader.name + ", <br /><br />This is to inform you that you have been appointed a Course Leader of " + course.title + ". Login to your OnArrivalUK account to begin creating exciting content for your employees. <br /><br />Have a lovely day, <br />OnArrivalUK<br /><img src='https://i.imgur.com/gI3MKyK.jpg' alt='LonAUK Logo'>"
    }

    return sgMail.send(msg);
};

exports.changeAssignCourse = async (req, res, next) => {
    const course = await Course.findOne({ where: { id: req.body.coursesToAssign } });
    const leader = await EnterpriseUser.findOne({ where: { id: req.body.leadersToAssign } });
    let leaderToUnassign = null;

    try{
        leaderToUnassign = await EnterpriseUser.findOne({ where: { CourseId: course.id } });
        leaderToUnassign.CourseId = null;
        await leaderToUnassign.save();
    } catch(error) { console.log(error); }

    leader.setCourse(course);
    await leader.save();

    course.hasLeader = 1;
    await course.save();

    if(!(leaderToUnassign == null)) {
        if(leaderToUnassign.id == req.session.userId) {
            req.session.isLeader = false;
            req.session.leadingCourse = null;
            req.session.courseTitle = null;

            return res.redirect("/enterprise/courses/change-assign?success=true&self=true");
        }
    }

    if(leader.id == req.session.userId) {
        req.session.isLeader = true;
        req.session.leadingCourse = course;
        req.session.courseTitle = course.title; 

        res.redirect("/enterprise/courses/change-assign?success=true&self=true");
    } else {
        res.redirect("/enterprise/courses/change-assign?success=true");
    }

    const msg = {
        to: leader.email,
        from: "contact@onarrival.uk",
        subject: "OnArrivalUK - You are now a Course Leader!",
        text: "Dear " + leader.name + ", This is to inform you that you have been appointed a Course Leader of " + course.title + ". Login to your OnArrivalUK account to begin creating exciting content for your employees. Have a lovely day, OnArrivalUK",
        html: "Dear " + leader.name + ", <br /><br />This is to inform you that you have been appointed a Course Leader of " + course.title + ". Login to your OnArrivalUK account to begin creating exciting content for your employees. <br /><br />Have a lovely day, <br />OnArrivalUK<br /><img src='https://i.imgur.com/gI3MKyK.jpg' alt='LonAUK Logo'>"
    }

    return sgMail.send(msg);
};

exports.getAddStudentPage = async (req, res, next) => {
    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];

    res.render("panel/add-student", {
        pageTitle: "Add a New Student",
        isAdmin: req.session.isAdmin,
        isLeader: req.session.isLeader,
        success: req.query.success,
        accountData: accountData
    });
};

exports.addNewStudent = async (req, res, next) => {
    const company = await Company.findOne({ where: { id: req.session.companyId } });
    const hashed = await bcrypt.hash(req.body.pass, 12);

    StudentUser.create({
        email: req.body.email,
        password: hashed,
        name: req.body.name,
        surname: req.body.surname,
        nationality: req.body.nationality,
        dateOfBirth: req.body.dateOfBirth,
    })
        .then(student => {
            student.setCompany(company);

            res.redirect("/enterprise/students/add?success=true");

            const msg = {
                to: student.email,
                from: "contact@onarrival.uk",
                subject: "OnArrivalUK - Your account is ready",
                text: "Dear " + student.name + ", This is to inform you that your employer has set up an OnArrivalUK account for you. You may soon join an exciting language course which will prepare you for your new position at the company. Use the following credentials to log in and stay tuned for news from your employer. Email: " + student.email + " Password: " + req.body.pass + " Have a lovely day, OnArrivalUK",
                html: "Dear " + student.name + ", <br /><br />This is to inform you that your employer has set up an OnArrivalUK account for you. You may soon join an exciting language course which will prepare you for your new position at the company. Use the following credentials to log in and stay tuned for news from your employer. <br /><br /><b>Email</b>: " + student.email + " <br /><b>Password</b>: " + req.body.pass + " <br /><br />Have a lovely day, <br />OnArrivalUK<br /><img src='https://i.imgur.com/gI3MKyK.jpg' alt='LonAUK Logo'>"
            }

            return sgMail.send(msg);
        })
        .catch(error => {
            console.log(error);
            return res.redirect("/enterprise/students/add?success=false");
        })
};

exports.getEditStudentPage = async (req, res, next) => {
    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];
    const student = await StudentUser.findOne({ where: { id: req.params.id } });

    res.render("panel/edit-student", {
        pageTitle: "Edit a Student",
        isAdmin: req.session.isAdmin,
        isLeader: req.session.isLeader,
        success: req.query.success,
        accountData: accountData,
        student: student
    });
};

exports.updateStudent = async (req, res, next) => {
    const student = await StudentUser.findOne({ where: { id: req.params.id } });

    student.email = req.body.email;
    student.name = req.body.name;
    student.surname = req.body.surname;
    student.nationality = req.body.nationality;
    student.dateOfBirth = req.body.dateOfBirth;
    
    if(!(req.body.pass == null)) {
        const passwordHashed = await bcrypt.hash(req.body.pass, 12);
        student.password = passwordHashed;
        await student.save();
    } else {
        await student.save();
    }

    res.redirect("/enterprise/students/view");
};


exports.getViewRepresentativesPage = async (req, res, next) => {
    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];
    const user = await EnterpriseUser.findOne({ where: { id: req.session.userId } });
    const company = await Company.findOne({ where: { id: req.session.companyId } });

    EnterpriseUser.findAll({ where: { CompanyId: req.session.companyId } })
        .then(leaders => {
            res.render("panel/view-leaders", {
                pageTitle: "View Your Course Leaders",
                isAdmin: req.session.isAdmin,
                isLeader: req.session.isLeader,
                accountData: accountData,
                company: company,
                user: user,
                leaders: leaders
            });
        })
        .catch(error => { console.log(error); })
};

exports.getEditAccountPage = async (req, res, next) => {
    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];
    const user = await EnterpriseUser.findOne({ where: { id: req.session.userId } });
    const company = await Company.findOne({ where: { id: req.session.companyId } });

    res.render("panel/edit-account", {
        pageTitle: "Edit Account Details",
        isAdmin: req.session.isAdmin,
        isLeader: req.session.isLeader,
        success: req.query.success,
        accountData: accountData,
        company: company,
        user: user
    });
};

// Capture new company's data and update the database
exports.updateCompanyDetails = async (req, res) => {
    const company = await Company.findOne({ where: { id: req.session.companyId } });
    company.name = req.query.name;
    company.email = req.query.email;
    company.telNum = req.query.telNum;
    await company.save();

    res.status(201).json({
        success: true
    });
}

exports.updateUserDetails = async (req, res) => {
    const user = await EnterpriseUser.findOne({ where: { id: req.session.userId } });
    user.name = req.query.name;
    user.surname = req.query.surname;
    user.department = req.query.department;
    user.email = req.query.email;
    if(req.query.password != "") {
        user.password = await bcrypt.hash(req.query.password, 12);
    }
    await user.save();

    req.session.fullName = req.query.name + " " + req.query.surname;

    res.status(201).json({
        success: true
    });
}

exports.getCurrentCompanyName = async (req, res) => {
    const company = await Company.findOne({ where: { id: req.session.companyId } });
    res.status(201).json({
        name: company.name
    });
};

exports.disableLeader = async (req, res) => {
    const leader = await EnterpriseUser.findOne({ where: { id: req.query.id } });
    leader.disabled = 1;
    await leader.save();
    res.status(200).json({
        success: true
    });
};

exports.enableLeader = async (req, res) => {
    const leader = await EnterpriseUser.findOne({ where: { id: req.query.id } });
    leader.disabled = 0;
    await leader.save();
    res.status(200).json({
        success: true
    });
};

exports.disableStudent = async (req, res) => {
    const student = await StudentUser.findOne({ where: { id: req.query.id } });
    student.disabled = 1;
    await student.save();
    res.status(200).json({
        success: true
    });
};

exports.enableStudent = async (req, res) => {
    const student = await StudentUser.findOne({ where: { id: req.query.id } });
    student.disabled = 0;
    await student.save();
    res.status(200).json({
        success: true
    });
};

exports.getViewStudentsPage = async (req, res, next) => {
    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];
    const user = await EnterpriseUser.findOne({ where: { id: req.session.userId } });
    const company = await Company.findOne({ where: { id: req.session.companyId } });

    StudentUser.findAll({ where: { CompanyId: req.session.companyId }, include: [Course] })
        .then(students => {
            res.render("panel/view-students", {
                pageTitle: "View Your Students",
                isAdmin: req.session.isAdmin,
                isLeader: req.session.isLeader,
                accountData: accountData,
                company: company,
                user: user,
                students: students
            });
        })
        .catch(error => { console.log(error); })
};

exports.disableCourse = async (req, res) => {
    const course = await Course.findOne({ where: { id: req.query.id } });
    course.disabled = 1;
    await course.save();
    res.status(200).json({
        success: true
    });
};

exports.enableCourse = async (req, res) => {
    const course = await Course.findOne({ where: { id: req.query.id } });
    course.disabled = 0;
    await course.save();
    res.status(200).json({
        success: true
    });
};

exports.disableCompEx = async (req, res) => {
    const exercise = await ComprehensionExercise.findOne({ where: { id: req.query.id } });
    exercise.disabled = 1;
    await exercise.save();
    res.status(200).json({
        success: true
    });
};

exports.enableCompEx = async (req, res) => {
    const exercise = await ComprehensionExercise.findOne({ where: { id: req.query.id } });
    exercise.disabled = 0;
    await exercise.save();
    res.status(200).json({
        success: true
    });
};

exports.disableVocabEx = async (req, res) => {
    const exercise = await VocabularyExercise.findOne({ where: { id: req.query.id } });
    exercise.disabled = 1;
    await exercise.save();
    res.status(200).json({
        success: true
    });
};

exports.enableVocabEx = async (req, res) => {
    const exercise = await VocabularyExercise.findOne({ where: { id: req.query.id } });
    exercise.disabled = 0;
    await exercise.save();
    res.status(200).json({
        success: true
    });
};

exports.disableChapter = async (req, res) => {
    let chapter;

    try {
        chapter = await Chapter.findOne({ where: { id: req.query.id } });
    } catch(error) {
        console.log(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    }

    chapter.disabled = true;

    try {
        await chapter.save();
    } catch(error) {
        console.log(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    }
    
    return res.status(StatusCodes.OK);
};

exports.enableChapter = async (req, res) => {
    let chapter;

    try {
        chapter = await Chapter.findOne({ where: { id: req.query.id } });
    } catch(error) {
        console.log(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    }

    chapter.disabled = false;

    try {
        await chapter.save();
    } catch(error) {
        console.log(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    }
    
    return res.status(StatusCodes.OK);
};

exports.getViewCoursesPage = async (req, res) => {
    let user, company, courses;

    const accountData = [req.session.fullName, req.session.companyName, req.session.courseTitle];

    try {
        user = await EnterpriseUser.findOne({ where: { id: req.session.userId } });
    } catch(error) {
        console.log(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if(!user) return res.status(StatusCodes.INTERNAL_SERVER_ERROR);

    try {
        company = await Company.findOne({ where: { id: req.session.companyId } });
    } catch(error) {
        console.log(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if(!company) return res.status(StatusCodes.INTERNAL_SERVER_ERROR);

    try {
        courses = await Course.findAll({ where: { CompanyId: req.session.companyId } })
    } catch(error) {
        console.log(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if(!courses) return res.status(StatusCodes.INTERNAL_SERVER_ERROR);

    return res.render("panel/view-courses", {
        pageTitle: "View Your Courses",
        isAdmin: req.session.isAdmin,
        isLeader: req.session.isLeader,
        accountData: accountData,
        company: company,
        user: user,
        courses: courses
    });
};

exports.getStudentResults = async (req, res) => {
    let scores;

    try {
        scores = await Score.findAll({ 
            where: { StudentUserId: req.query.id }, 
            include: {
                model: ComprehensionExercise
            }
        })
    } catch(error) {
        console.log(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if(!scores) return res.status(StatusCodes.INTERNAL_SERVER_ERROR);

    return res.status(StatusCodes.OK).json({ results: scores });
};

exports.confirmLeaderUnique = async (req, res) => {
    let users;

    try {
        users = await EnterpriseUser.findAll({ where: { email: req.body.email } });
    } catch(error) {
        console.log(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if(!users) return res.status(StatusCodes.INTERNAL_SERVER_ERROR);

    if(users.length === 0) return res.status(StatusCodes.OK).json({ unique: true });

    return res.status(StatusCodes.OK).json({ unique: false });
};

exports.confirmStudentUnique = async (req, res) => {
    let users;

    try {
        users = await StudentUser.findAll({ where: { email: req.body.email } });
    } catch(error) {
        console.log(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if(!users) return res.status(StatusCodes.INTERNAL_SERVER_ERROR);

    if(users.length === 0) return res.status(StatusCodes.OK).json({ unique: true });

    return res.status(StatusCodes.OK).json({ unique: false });
};