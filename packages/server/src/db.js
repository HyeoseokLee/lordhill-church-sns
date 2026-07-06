import config from 'config';
import Sequelize from 'sequelize';
import User from './user/models/User.js';
import Post from './post/models/Post.js';
import PostMedia from './post/models/PostMedia.js';
import Like from './post/models/Like.js';
import Comment from './comment/models/Comment.js';
import AdminAuditLog from './admin/models/AdminAuditLog.js';
import FcmToken from './push/models/FcmToken.js';
import PushLog from './push/models/PushLog.js';
import Push from './push/models/Push.js';
import Recycle from './recycle/models/Recycle.js';
import RecycleMedia from './recycle/models/RecycleMedia.js';
import RecycleComment from './recycle/models/RecycleComment.js';
import Counterparty from './counterparty/models/Counterparty.js';
import TransactionCategory from './transaction-category/models/TransactionCategory.js';
import Transaction from './transaction/models/Transaction.js';
import Report from './report/models/Report.js';
import Notice from './notice/models/Notice.js';
import UserBlock from './block/models/UserBlock.js';
import NoticeMedia from './notice/models/NoticeMedia.js';
import Suggestion from './suggestion/models/Suggestion.js';
import SuggestionComment from './suggestion/models/SuggestionComment.js';
import FundTransaction from './fund-transaction/models/FundTransaction.js';
import MealRestaurant from './meal/models/MealRestaurant.js';
import MealMenu from './meal/models/MealMenu.js';
import MealEvent from './meal/models/MealEvent.js';
import MealOrder from './meal/models/MealOrder.js';
import MealOrderItem from './meal/models/MealOrderItem.js';

// config 패키지는 immutable 객체를 반환 — Sequelize가 내부 수정 시 hanging 발생
const dbconfig = JSON.parse(JSON.stringify(config.sequelize));

const db = {};

const sequelize = new Sequelize(
  dbconfig.database,
  dbconfig.username,
  dbconfig.password,
  dbconfig,
);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.getPoolStats = () => {
  const { pool } = sequelize.connectionManager;
  if (!pool) {
    return {};
  }

  return {
    minSize: pool.minSize,
    maxSize: pool.maxSize,
    size: pool.size,
    available: pool.available,
    using: pool.using,
    waiting: pool.waiting,
  };
};

// 모델 등록
db.User = User(sequelize);
db.Post = Post(sequelize);
db.PostMedia = PostMedia(sequelize);
db.Like = Like(sequelize);
db.Comment = Comment(sequelize);
db.AdminAuditLog = AdminAuditLog(sequelize);
db.FcmToken = FcmToken(sequelize);
db.PushLog = PushLog(sequelize);
db.Push = Push(sequelize);
db.Recycle = Recycle(sequelize);
db.RecycleMedia = RecycleMedia(sequelize);
db.RecycleComment = RecycleComment(sequelize);
db.Counterparty = Counterparty(sequelize);
db.TransactionCategory = TransactionCategory(sequelize);
db.Transaction = Transaction(sequelize);
db.Report = Report(sequelize);
db.Notice = Notice(sequelize);
db.UserBlock = UserBlock(sequelize);
db.NoticeMedia = NoticeMedia(sequelize);
db.Suggestion = Suggestion(sequelize);
db.SuggestionComment = SuggestionComment(sequelize);
db.FundTransaction = FundTransaction(sequelize);
db.MealRestaurant = MealRestaurant(sequelize);
db.MealMenu = MealMenu(sequelize);
db.MealEvent = MealEvent(sequelize);
db.MealOrder = MealOrder(sequelize);
db.MealOrderItem = MealOrderItem(sequelize);

// Association 설정
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export default db;
