import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppHeader from '../components/AppHeader';
import Text from '../components/TranslatedText';
import BRAND from '../config';
import { ismServices } from '../../services/ismServices';
import { usePermissions } from '../../Utils/ConetextApi';

const THEME = {
  primary: BRAND?.COLORS?.primary || '#0066cc',
  darkBg: '#0F1117',
  darkCard: '#1A1D27',
  lightCard: '#FFFFFF',
  danger: '#EF4444',
  success: '#10B981',
};

const SurveyDetailsPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { nightMode, userInfo } = usePermissions();
  const { surveyId, surveyName, description, attachment } = route.params;

  const theme = {
    bg: nightMode ? THEME.darkBg : '#F3F4F6',
    card: nightMode ? THEME.darkCard : THEME.lightCard,
    text: nightMode ? '#F8FAFC' : '#111827',
    sub: nightMode ? '#94A3B8' : '#6B7280',
    border: nightMode ? '#334155' : '#E5E7EB',
    inputBg: nightMode ? '#2A2D37' : '#F3F4F6',
    circleBorder: nightMode ? '#4B5563' : '#9CA3AF',
  };

  // --- Core State ---
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [imgUrl, setImgUrl] = useState([]); // Array indexed by question index

  // --- Feature State ---
  const [isSurveyGiven, setIsSurveyGiven] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  
  // --- Date Picker State ---
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateQuestion, setCurrentDateQuestion] = useState(null);
  const [dateMode, setDateMode] = useState('date'); // 'date', 'time', or 'datetime'

  // User role check
  const userRole = userInfo?.role;
  const userTenant = userInfo?.tenant;
  const showSurvey = userRole === 'resident' || userTenant === 1;
  const isReadOnly = userRole === 'member';

  // Derived variable
  const isLocked = (isSurveyGiven && !isEditMode) || isReadOnly;

  useEffect(() => {
    loadSurveyData();
  }, []);

  const loadSurveyData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Questions
      const qRes = await ismServices.getSurveyQuestions(surveyId);
      const fetchedQuestions = qRes?.data || [];
      
      // Parse options for each question
      const parsedQuestions = fetchedQuestions.map(q => {
        let parsedOptions = [];
        try {
          const optionsObj = JSON.parse(q.option || '{}');
          parsedOptions = Object.values(optionsObj);
        } catch (e) {
          console.log('Error parsing options:', e);
        }

        // Parse comment label from data field
        let commentLabel = '';
        try {
          const dataObj = JSON.parse(q.data || '{}');
          commentLabel = dataObj?.comment?.label || '';
        } catch (e) {}

        return {
          ...q,
          options: parsedOptions,
          commentname: commentLabel,
        };
      });

      setQuestions(parsedQuestions);

      // 2. Fetch User's Past Survey Answers
      const pastSurvey = await ismServices.getUserSurvey(surveyId);

      if (pastSurvey && pastSurvey.length > 0) {
        setIsSurveyGiven(true);
        const mappedAnswers = {};
        const mappedImages = [];

        pastSurvey.forEach((ans) => {
          const qIndex = parsedQuestions.findIndex(q => q.id === ans.question_id);
          
          mappedAnswers[ans.question_id] = {
            answer: ans.answer,
            comment: ans.comment || '',
            res_id: ans.id,
          };

          // Store images by question index
          if (ans.answer && ans.answer.startsWith('data:image')) {
            mappedImages[qIndex] = ans.answer;
          }
        });

        setAnswers(mappedAnswers);
        setImgUrl(mappedImages);
      }
    } catch (e) {
      console.log('Survey Data Error:', e);
      Alert.alert(t('Error'), t('Failed to load survey data'));
    } finally {
      setLoading(false);
    }
  };

  // --- Input Handlers ---
  const updateAnswer = (qId, key, value) => {
    if (isLocked) return;
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        [key]: value,
      },
    }));
  };

  // Image Upload Handler
  const handleImageUpload = async (qId, qIndex) => {
    if (isLocked) return;

    Alert.alert(
      t("Upload Image"),
      t("Choose an option to upload your document or image"),
      [
        {
          text: t("Take Picture"),
          onPress: () => {
            launchCamera(
              { mediaType: 'photo', includeBase64: true, quality: 0.6 },
              (response) => {
                if (response.didCancel || response.errorCode) return;
                if (response.assets && response.assets.length > 0) {
                  const asset = response.assets[0];
                  const base64Image = `data:${asset.type};base64,${asset.base64}`;
                  
                  // Update both answer and image array
                  updateAnswer(qId, 'answer', base64Image);
                  const newImgUrl = [...imgUrl];
                  newImgUrl[qIndex] = base64Image;
                  setImgUrl(newImgUrl);
                }
              }
            );
          }
        },
        {
          text: t("Choose from Gallery"),
          onPress: () => {
            launchImageLibrary(
              { mediaType: 'photo', includeBase64: true, quality: 0.6 },
              (response) => {
                if (response.didCancel || response.errorCode) return;
                if (response.assets && response.assets.length > 0) {
                  const asset = response.assets[0];
                  const base64Image = `data:${asset.type};base64,${asset.base64}`;
                  
                  updateAnswer(qId, 'answer', base64Image);
                  const newImgUrl = [...imgUrl];
                  newImgUrl[qIndex] = base64Image;
                  setImgUrl(newImgUrl);
                }
              }
            );
          }
        },
        { text: t("Cancel"), style: "cancel" }
      ]
    );
  };

  // Date/Time Picker Handler
  const handleDateSelect = (qId, questionOptions) => {
    if (isLocked) return;

    // Determine date mode from question options
    let mode = 'date';
    if (questionOptions.includes('time')) {
      mode = 'time';
    } else if (questionOptions.includes('date/time')) {
      mode = 'datetime';
    }

    setDateMode(mode);
    setCurrentDateQuestion(qId);
    setShowDatePicker(true);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    
    if (event.type === 'set' && selectedDate && currentDateQuestion) {
      let formattedDate = '';
      
      if (dateMode === 'date') {
        formattedDate = selectedDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
      } else if (dateMode === 'time') {
        formattedDate = selectedDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else {
        formattedDate = `${selectedDate.toLocaleDateString('en-GB')} ${selectedDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      }

      updateAnswer(currentDateQuestion, 'answer', formattedDate);
    }
    
    setCurrentDateQuestion(null);
  };

  // --- Submit & Validation Logic ---
  const isSurveyCompleted = () => {
    let count = 0;
    questions.forEach((q) => {
      const userAns = answers[q.id]?.answer;
      if (userAns && userAns !== "") {
        count++;
      }
    });

    const total = questions.length;
    if (count < total) {
      Alert.alert(
        t('Alert'),
        t(`You have answered ${count} out of ${total} questions. Do you want to continue?`),
        [
          { text: t('Cancel'), style: 'cancel' },
          { text: t('Continue'), onPress: () => processSubmit() }
        ]
      );
      return false;
    }
    return true;
  };

  const processSubmit = async () => {
    const payload = questions.map((q) => {
      const qData = answers[q.id] || {};
      
      if (isEditMode) {
        return {
          answer: qData.answer || '',
          comment: qData.comment || '',
          type: q.type,
          id: qData.res_id,
        };
      } else {
        return {
          question_id: q.id,
          answer: qData.answer || '',
          comment: qData.comment || '',
          type: q.type,
          survey_id: surveyId,
        };
      }
    });

    console.log("Submitting Data:", payload);

    try {
      let result;
      if (isEditMode) {
        result = await ismServices.editSurvey(payload);
      } else {
        result = await ismServices.submitSurvey(payload);
      }

      if (result.success) {
        Alert.alert(
          t("Success"), 
          result.message || t("Survey submitted successfully!"),
          [{ text: t("OK"), onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(t("Error"), result.message || t("Failed to submit survey."));
      }
    } catch (e) {
      console.log('Submit error:', e);
      Alert.alert(t("Error"), t("Failed to submit survey."));
    }
  };

  const handleSubmitTap = () => {
    if (isSurveyCompleted()) {
      processSubmit();
    }
  };

  // --- Render Functions ---
  const renderQuestionInput = (q, index) => {
    const currentAnswer = answers[q.id]?.answer || '';
    const currentComment = answers[q.id]?.comment || '';
    let inputElement = null;

    // 1. TEXT INPUT
    if (q.type === 'text') {
      inputElement = (
        <TextInput
          style={[styles.textArea, { backgroundColor: theme.inputBg, color: theme.text }]}
          placeholder={t("Type Here...")}
          placeholderTextColor={theme.sub}
          multiline
          editable={!isLocked}
          value={currentAnswer}
          onChangeText={(text) => updateAnswer(q.id, 'answer', text)}
        />
      );
    }

    // 2. MULTIPLE CHOICE
    else if (q.type === 'Multiple Choice' || q.type === 'Drop Down') {
      inputElement = (
        <View style={styles.optionsContainer}>
          {q.options.map((opt, idx) => {
            const isSelected = currentAnswer === opt;
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={isLocked ? 1 : 0.7}
                style={styles.optionRow}
                onPress={() => !isLocked && updateAnswer(q.id, 'answer', opt)}
              >
                <Text style={[styles.optionText, { color: theme.text }]}>{opt}</Text>
                <View style={[
                  styles.radioCircle, 
                  { borderColor: isSelected ? THEME.primary : theme.circleBorder }
                ]}>
                  {isSelected && <View style={[styles.innerDot, { backgroundColor: THEME.primary }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    // 3. DATE & TIME
    else if (q.type === 'date' || q.type === 'time') {
      inputElement = (
        <TouchableOpacity
          style={[styles.uploadBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
          onPress={() => handleDateSelect(q.id, q.options)}
          activeOpacity={isLocked ? 1 : 0.7}
        >
          <Ionicons name="calendar-outline" size={24} color={THEME.primary} />
          <Text style={{ color: currentAnswer ? theme.text : theme.sub, marginTop: 8 }}>
            {currentAnswer || t(`Select ${q.type}`)}
          </Text>
        </TouchableOpacity>
      );
    }

    // 4. DOCUMENT / IMAGE UPLOAD
    else if (q.type === 'document') {
      const imageForThisQuestion = imgUrl[index];
      
      inputElement = (
        <View>
          {imageForThisQuestion ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageForThisQuestion }} style={styles.imagePreview} />
              {!isLocked && (
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => {
                    updateAnswer(q.id, 'answer', '');
                    const newImgUrl = [...imgUrl];
                    newImgUrl[index] = null;
                    setImgUrl(newImgUrl);
                  }}
                >
                  <Ionicons name="close" size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.uploadBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
              onPress={() => handleImageUpload(q.id, index)}
              activeOpacity={isLocked ? 1 : 0.7}
            >
              <Ionicons name="cloud-upload-outline" size={28} color={theme.sub} />
              <Text style={{ color: theme.sub, marginTop: 8 }}>
                {t("Upload File / Take Picture")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View>
        {inputElement}

        {/* EXTRA COMMENT BOX */}
        {q.commentname ? (
          <View style={styles.commentSection}>
            <Text style={[styles.commentLabel, { color: theme.text }]}>
              <Ionicons name="chatbubble-ellipses-outline" /> {q.commentname}
            </Text>
            <TextInput
              style={[styles.commentInput, { backgroundColor: theme.inputBg, color: theme.text }]}
              placeholder={t("Additional comments...")}
              placeholderTextColor={theme.sub}
              editable={!isLocked}
              value={currentComment}
              onChangeText={(text) => updateAnswer(q.id, 'comment', text)}
            />
          </View>
        ) : null}
      </View>
    );
  };

  // Utility function to check if URL is an image
  const isImage = (url) => {
    if (!url) return false;
    return url.match(/\.(jpeg|jpg|gif|png)$/i) || url.startsWith('data:image');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader title={t("Survey Form")} showBack />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* READ-ONLY MESSAGE FOR MEMBERS */}
        {isReadOnly && (
          <View style={[styles.submittedBanner, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="information-circle" size={20} color={THEME.danger} />
            <Text style={[styles.submittedText, { color: '#991B1B' }]}>
              {t("You can only view this survey. Editing is not allowed.")}
            </Text>
          </View>
        )}

        {/* ALREADY SUBMITTED BANNER */}
        {isSurveyGiven && !isEditMode && !isReadOnly && (
          <View style={styles.submittedBanner}>
            <Ionicons name="checkmark-circle" size={20} color={THEME.success} />
            <Text style={styles.submittedText}>
              {t("You have already submitted this survey.")}
            </Text>
          </View>
        )}

        {/* HEADER & DESCRIPTION */}
        <View style={[styles.topCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            {surveyName?.replace(/^"|"$/g, '') || "Survey Form"}
          </Text>

          {description ? (
            <View>
              <Text
                style={[styles.description, { color: theme.sub }]}
                numberOfLines={showFullDesc ? undefined : 2}
              >
                {description}
              </Text>
              <TouchableOpacity onPress={() => setShowFullDesc(!showFullDesc)} style={{ marginTop: 8 }}>
                <Text style={{ color: THEME.primary, fontSize: 13, fontWeight: '600' }}>
                  {showFullDesc ? t("Read Less") : t("Read More")}{' '}
                  <Ionicons name={showFullDesc ? "chevron-up" : "chevron-down"} />
                </Text>
              </TouchableOpacity>

              {/* ATTACHMENT DISPLAY */}
              {showFullDesc && attachment && (
                <View style={{ marginTop: 12 }}>
                  {isImage(attachment) ? (
                    <Image 
                      source={{ uri: attachment }} 
                      style={styles.attachmentImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <TouchableOpacity 
                      style={styles.attachmentDoc}
                      onPress={() => {/* Open document */}}
                    >
                      <Ionicons name="document-outline" size={40} color={THEME.primary} />
                      <Text style={{ color: theme.text, marginTop: 8 }}>
                        {t("View Attachment")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ) : null}
        </View>

        {/* QUESTIONS */}
        {loading ? (
          <ActivityIndicator size="large" color={THEME.primary} style={{ marginTop: 40 }} />
        ) : (
          questions.map((q, index) => (
            <View
              key={q.id}
              style={[styles.questionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={[styles.questionText, { color: theme.text }]}>
                {index + 1}. {q.name}
              </Text>
              {renderQuestionInput(q, index)}
            </View>
          ))
        )}
      </ScrollView>

      {/* DATE/TIME PICKER MODAL */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode={dateMode === 'datetime' ? 'date' : dateMode}
          display="default"
          onChange={onDateChange}
        />
      )}

      {/* FIXED BOTTOM ACTION BAR */}
      {!loading && questions.length > 0 && showSurvey && (
        <View style={[styles.bottomBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          {isSurveyGiven && !isEditMode ? (
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#4B5563' }]}
              onPress={() => setIsEditMode(true)}
            >
              <Text style={styles.submitButtonText}>{t("Edit Survey")}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: THEME.primary }]}
              onPress={handleSubmitTap}
            >
              <Text style={styles.submitButtonText}>
                {isEditMode ? t("Save Changes") : t("Submit Survey")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default SurveyDetailsPage;

const styles = StyleSheet.create({
  topCard: { 
    padding: 18, 
    borderRadius: 8, 
    marginBottom: 16, 
    shadowOpacity: 0.05, 
    elevation: 2 
  },
  title: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 8 
  },
  description: { 
    lineHeight: 22, 
    fontSize: 14 
  },
  submittedBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#D1FAE5', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 16 
  },
  submittedText: { 
    color: '#065F46', 
    fontWeight: '600', 
    marginLeft: 8,
    flex: 1,
  },
  questionCard: { 
    padding: 18, 
    borderRadius: 8, 
    marginBottom: 12, 
    elevation: 1 
  },
  questionText: { 
    fontSize: 15, 
    fontWeight: '600', 
    lineHeight: 22, 
    marginBottom: 16 
  },
  textArea: { 
    borderRadius: 4, 
    padding: 16, 
    fontSize: 14, 
    minHeight: 120, 
    textAlignVertical: 'top' 
  },
  optionsContainer: { 
    marginTop: 4 
  },
  optionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14 
  },
  optionText: { 
    fontSize: 15, 
    flex: 1, 
    paddingRight: 16 
  },
  radioCircle: { 
    height: 22, 
    width: 22, 
    borderRadius: 11, 
    borderWidth: 1.5, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  innerDot: { 
    height: 12, 
    width: 12, 
    borderRadius: 6 
  },
  uploadBox: { 
    borderWidth: 1, 
    borderStyle: 'dashed', 
    borderRadius: 8, 
    padding: 24, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  imagePreviewContainer: { 
    position: 'relative', 
    height: 150, 
    width: '100%', 
    borderRadius: 8, 
    overflow: 'hidden' 
  },
  imagePreview: { 
    height: '100%', 
    width: '100%', 
    resizeMode: 'cover' 
  },
  removeImageBtn: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    padding: 4, 
    borderRadius: 15 
  },
  commentSection: { 
    marginTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#E5E7EB', 
    paddingTop: 12 
  },
  commentLabel: { 
    fontSize: 13, 
    fontWeight: '600', 
    marginBottom: 8 
  },
  commentInput: { 
    borderRadius: 4, 
    padding: 12, 
    fontSize: 14, 
    minHeight: 50 
  },
  bottomBar: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 16, 
    borderTopWidth: 1 
  },
  submitButton: { 
    paddingVertical: 14, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  submitButtonText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  attachmentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  attachmentDoc: {
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 8,
  },
});
