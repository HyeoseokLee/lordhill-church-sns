import config from 'config';
import Sequelize from 'sequelize';
import User from './user/models/User.js';
import Post from './post/models/Post.js';
import PostMedia from './post/models/PostMedia.js';
import Like from './post/models/Like.js';
import Comment from './comment/models/Comment.js';
import AdminAuditLog from './admin/models/AdminAuditLog.js';

const dbconfig = config.sequelize;

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

// Association 설정
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export default db;
